# Changing a live table without an outage

Every DDL statement in Postgres takes a lock. The question that decides whether a migration is
safe is never "does this work" against an empty dev database — it's which lock level it takes,
how long it holds it, and who else is waiting on the same table.

## Locks: who blocks whom

Most `ALTER TABLE` variants take `ACCESS EXCLUSIVE` — the strongest lock Postgres has. It
blocks every other statement on that table, including plain `SELECT`. The lock itself is often
held for a trivial amount of time (adding a nullable column is a metadata-only change), but two
things make even a trivial lock dangerous:

- **It has to wait its turn.** If any other transaction — even a read — holds a weaker lock on
  the table and hasn't committed, your `ALTER TABLE` queues behind it. That part alone is fine.
  The dangerous part is what happens *after* your statement starts queuing: every query that
  comes in behind it, including plain `SELECT`s, queues behind *your* `ALTER TABLE` too, because
  Postgres's lock queue is FIFO per relation. One long-running report query plus one "harmless"
  instant `ADD COLUMN` can freeze an entire table's traffic for as long as that report takes to
  finish.
- **The fix is `lock_timeout`, not hope.** `SET lock_timeout = '2s'` before the `ALTER TABLE`
  means: if the lock isn't available within 2 seconds, abort with an error instead of joining
  the queue and blocking everything behind you. A migration that fails fast and gets retried is
  recoverable. A migration that queues silently behind a stuck report for twenty minutes, with
  the whole app down the whole time, is an incident. Pair it with `statement_timeout` for the
  same reason on statements that might themselves run long.

## Safe vs. dangerous, operation by operation

| Change | Lock behavior | Verdict |
|---|---|---|
| Add nullable column, no default | `ACCESS EXCLUSIVE`, instant (metadata only) | Safe — but still wrap in `lock_timeout` |
| Add column with a volatile default (`default random()`, `default now()`) | `ACCESS EXCLUSIVE` for a full table rewrite | Dangerous — add nullable, backfill, then set the default for new rows only |
| Add column with a constant/immutable default | Metadata only since Postgres 11 ("fast default") | Safe |
| `SET NOT NULL` on an existing column | `ACCESS EXCLUSIVE` **plus a full scan** to verify no nulls exist | Dangerous unless you validate first — see below |
| `ALTER COLUMN ... TYPE` (e.g. `int` → `bigint`) | Full table rewrite under `ACCESS EXCLUSIVE` (this specific widening is not a fast-path case) | Dangerous — new column, backfill, swap |
| Rename a column | Instant, but every deployed reader of the old name breaks the moment it commits | Dangerous — expand/contract with a view or dual writes, never a bare rename |
| Drop a column | Instant | Safe only after no deployed code reads it anymore |
| `CREATE INDEX` | `SHARE` lock — blocks writes, not reads, for the whole build | Dangerous on a large table — writers queue for the build's full duration |
| `CREATE INDEX CONCURRENTLY` | No blocking lock; builds in the background | Safe, with two costs: it can't run inside a transaction block, and if it's interrupted it leaves an `INVALID` index behind that you must `DROP INDEX` before retrying |

## Backfilling without a stop-the-world `UPDATE`

`UPDATE tasks SET estimate = ...` with no `WHERE` clause on a large table opens one long
transaction: it holds row locks on everything it touches until commit, generates a burst of WAL
that can lag replicas, and if it fails partway through, the whole thing rolls back and you start
over. The fix is the same shape every time: a bounded loop, keyed on the primary key, that
updates a batch, commits, and repeats until nothing is left:

```sql
do $$
declare
  updated int;
begin
  loop
    update tasks set estimate = make_interval(mins => estimate_minutes)
    where id in (
      select id from tasks where estimate is null and estimate_minutes is not null limit 1000
    );
    get diagnostics updated = row_count;
    exit when updated = 0;
    -- a real migration runner sleeps briefly here between batches
  end loop;
end $$;
```

Two things make this safe to re-run: the `WHERE estimate is null` makes each batch idempotent
(a retried batch just finds nothing left to do), and each batch is its own small transaction, so
a crash mid-backfill loses at most one batch of work, not the whole job. In application code
(rather than a single `DO` block) the loop is a keyset-paginated query — `WHERE id > $last_id
ORDER BY id LIMIT $size` — that a Go migration job calls repeatedly, sleeping between batches to
leave headroom for real traffic.

## Adding a constraint without blocking writers

`ALTER TABLE ... ADD CONSTRAINT ... CHECK (...)` normally scans the whole table under a lock that
blocks writes for the scan's duration, to make sure every existing row already satisfies it. Split
it into two statements instead:

```sql
alter table tasks add constraint estimate_nonnegative
  check (estimate is null or estimate >= interval '0') not valid;

alter table tasks validate constraint estimate_nonnegative;
```

The first statement is instant: it starts enforcing the check on every *new or updated* row
immediately, but takes Postgres's word for existing rows without scanning them (hence `not
valid`). The second statement does the scan, but only needs a lock weak enough to allow reads and
writes concurrently (`SHARE UPDATE EXCLUSIVE`) — it just can't run at the same time as another
schema change on the table. Run it as its own migration, separate from the one that added the
constraint, so a slow validate on a huge table doesn't hold up the deploy that needed the
constraint to start protecting new writes.

The same two-step pattern is how you safely add `NOT NULL` to a column that already has data:
backfill the nulls, add a `CHECK (col IS NOT NULL) NOT VALID`, validate it, then run `ALTER
COLUMN ... SET NOT NULL` (which, with a validated check already proving no nulls exist, skips
its own table scan) and finally drop the now-redundant check constraint.

## Enums, renames, and the expand/contract choreography

Enum values are easy to add (`ALTER TYPE status ADD VALUE 'archived'`) and effectively impossible
to remove — Postgres has no `DROP VALUE`, only replacing the whole type. If a column's set of
values changes often, prefer `text` plus a `CHECK` constraint over an enum; you get the same
validation with a constraint you can actually swap out.

A rename is a full expand/contract cycle, not one migration:

1. **Expand**: add the new column (`estimate interval`), add a trigger so writes to either column
   keep both in sync, backfill the new column in batches, validate whatever constraint you need.
   Recreate any view that exposed the old shape so it still does, exposing both columns.
2. **Migrate the app**: deploy code that reads and writes the new column. The trigger means old
   code paths still in flight (a rolling deploy, a stuck pod) keep working against the old column
   during the rollout.
3. **Contract**: once every deployed instance is on the new code — confirmed, not assumed — drop
   the trigger, drop the old column, and simplify the compatibility view.

At every step, the rollback is "redeploy the previous code," never "reverse the migration" —
this is exactly the constraint [[93-release-safety]] named: the schema change has to outlive a
code rollback, so it can only ever add capability, never remove it, until a later deploy commits
to the new shape.

## Large tables

Everything above assumes a table you can scan or rewrite, slowly, within a maintenance window
measured in minutes. Past some size (low tens of millions of rows is a common rule of thumb, but
it's workload-dependent), even a `CONCURRENTLY` index build or a batched backfill can run for
hours and compete with production traffic for I/O. That's the point where partitioning — splitting
one big table into many smaller physical tables by range or list, transparent to most queries —
turns a single unbounded operation into per-partition operations you can run and monitor
independently. Worth naming in an interview as the next tool up, not something to reach for by
default.

## Further reading (optional)

- [PostgreSQL: Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- [PostgreSQL: ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [PostgreSQL: CREATE INDEX (CONCURRENTLY)](https://www.postgresql.org/docs/current/sql-createindex.html#SQL-CREATEINDEX-CONCURRENTLY)
- [PostgreSQL: lock_timeout](https://www.postgresql.org/docs/current/runtime-config-client.html#GUC-LOCK-TIMEOUT)
