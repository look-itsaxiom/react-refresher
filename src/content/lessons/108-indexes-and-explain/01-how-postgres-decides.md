# How Postgres decides

[Lesson 106](/) built the schema; [lesson 107](/) wrote queries against it. Neither asked
*how fast* those queries run, or why. That's this lesson's job, and it's the one piece of
PostgreSQL knowledge that shows up by name in interviews for roles like this one: "how would
you find out why this query is slow?" is a real question, and "look at the query plan" is
the first sentence of a real answer.

## Heap, index, and the cost model

A Postgres table's rows live in the **heap** — an unordered collection of 8KB pages, no
implicit ordering. Finding a row by scanning the heap page by page is a **sequential scan**
(`Seq Scan`): read every page, check every row against the filter. That's the only option
without an index, and for a genuinely small table it's often the *fastest* option too,
because reading 20 sequential pages beats a random-access index lookup plus a random-access
heap fetch for each match. Small tables get sequential scans not because Postgres is being
lazy — it's the cheaper plan.

An **index** is a separate data structure, most commonly a **B-tree**, that stores a sorted
copy of one or more columns plus a pointer back to each row's location in the heap. A B-tree
lookup for an equality or range condition costs roughly `O(log n)` page reads to find the
starting point, plus one page read per matching row's heap location — versus `O(n)` for a
seq scan. The crossover point where an index beats a sequential scan depends on the table's
size and the query's **selectivity** (what fraction of rows match): a filter that matches 40%
of a table is usually still cheaper as a seq scan, because random-access heap fetches for
40% of the rows cost more than reading the whole table in page order. A filter that matches
0.5% is a clear index win.

Postgres picks a plan using a **cost model**, not a fixed rule. Every plan node gets an
estimated cost in abstract units, built from planner constants — `seq_page_cost` (default 1),
`random_page_cost` (default 4, reflecting that random disk I/O historically cost ~4x
sequential I/O; lower it toward 1.1 on SSD-backed systems, which is standard advice for
anything not spinning rust) — and **statistics** gathered by `ANALYZE`: row counts, the
distribution of values per column (most-common values and their frequencies, a histogram for
the rest), and correlation between physical row order and column value. Autovacuum runs
`ANALYZE` automatically after enough rows change, but a bulk load or a freshly seeded table
(exactly what this lesson's exercises do) needs an explicit `ANALYZE` before the planner has
anything to estimate from — this is a real footgun after a bulk import in production, not
just a lesson artifact.

## Reading EXPLAIN

`EXPLAIN <query>` prints the planner's chosen plan tree and its cost *estimates*, without
running the query. `EXPLAIN ANALYZE <query>` actually runs it and adds *actual* timing and
row counts per node, which is what you want whenever the query is safe to run (careful with
`ANALYZE` on a real `DELETE`/`UPDATE` in production — it executes the statement).
`EXPLAIN (ANALYZE, BUFFERS)` additionally reports page hits/reads per node, which is the
detail that tells you whether a slow query is CPU-bound or I/O-bound. Read the tree from the
innermost, most-indented node outward — that's execution order; the outermost node is what
the client receives.

```
Limit  (cost=59.55..59.60 rows=19 width=47) (actual time=0.041..0.052 rows=16 loops=1)
  ->  Sort  (cost=59.55..59.60 rows=19 width=47) (actual time=0.041..0.043 rows=16 loops=1)
        Sort Key: due_on
        ->  Bitmap Heap Scan on tasks  (cost=4.46..56.54 rows=17 width=47) (actual time=0.020..0.030 rows=16 loops=1)
              Recheck Cond: ((project_id = 7) AND (status = 'todo') AND (deleted_at IS NULL))
              ->  Bitmap Index Scan on idx_a  (cost=0.00..4.46 rows=17 width=0) (actual time=0.012..0.012 rows=16 loops=1)
                    Index Cond: ((project_id = 7) AND (status = 'todo'))
```

Node types worth recognizing on sight:

- **Seq Scan** — full heap scan, with an optional `Filter` applied per row after reading it.
- **Index Scan** — walks the B-tree, then fetches each matching row from the heap
  individually. Good when few rows match.
- **Index Only Scan** — like Index Scan, but every column the query needs is present in the
  index itself, so it skips the heap fetch entirely *for rows the visibility map marks
  all-visible* (more on that in the next lesson step).
- **Bitmap Index Scan → Bitmap Heap Scan** — builds an in-memory bitmap of matching heap
  pages from the index, then visits those pages in physical order. This is the planner's
  middle ground between "too many rows for an Index Scan's random access" and "too few rows
  to justify a Seq Scan" — you'll see it constantly once you start indexing anything with
  moderate selectivity, including throughout this lesson's own exercises.
- **Nested Loop** — for each row of the outer input, re-runs the inner plan. Fine when the
  outer side is small or the inner side is an indexed lookup; a disaster when the inner side
  is a Seq Scan and the outer side isn't tiny, because the inner scan reruns once per outer
  row (`loops=N` in `ANALYZE` output makes this visible directly).
- **Hash Join** — builds a hash table from one input, probes it with the other. Postgres's
  default for equi-joins between two larger sets.
- **Merge Join** — walks two pre-sorted inputs in lockstep. Shows up when both sides are
  already ordered (often by an index) on the join key.
- **Sort** — an explicit sort node. Watch for "external merge" in the `ANALYZE` output
  (`Sort Method: external merge  Disk: 4200kB`) — that means the sort spilled to disk because
  it didn't fit in `work_mem`, which is one of the slowest things a plan can do.
- **Aggregate** — `count()`, `sum()`, `group by`, etc.

## Three plan smells worth training yourself to spot

1. **Estimated rows wildly off from actual rows.** `rows=17` estimated vs `rows=4000` actual
   (or the reverse) means the planner's statistics are stale or the predicate is something
   `ANALYZE` can't model well (a correlated multi-column filter, an expression it hasn't seen
   an expression index for). A bad row estimate anywhere in the tree can cascade into a bad
   plan shape everywhere above it — the fix is usually `ANALYZE`, sometimes extended
   statistics (`CREATE STATISTICS`) for correlated columns, out of scope here.
2. **A Sort with `Sort Method: external merge` and a `Disk:` line.** The sort spilled to
   temp files because the data didn't fit in `work_mem`. Fixes: raise `work_mem` for the
   session/query, reduce what's being sorted (filter earlier), or replace the sort with an
   index that already produces the required order — see keyset pagination below.
3. **A Nested Loop whose inner side is a Seq Scan on a table that isn't tiny, run inside an
   outer loop with more than a handful of rows.** Check the inner scan's `loops=N`: that scan
   ran N times, not once. This is the textbook database-side N+1 — see the next lesson step.

## Keyset pagination: the index-friendly alternative to OFFSET

`ORDER BY due_on, id LIMIT 50 OFFSET 5000` forces Postgres to walk and discard the first
5,000 matching rows on every request — the cost grows with the offset, and an index doesn't
help skip rows it still has to visit in order. **Keyset pagination** (also called "seek
pagination") replaces the offset with a `WHERE` condition on the last row's sort key from the
previous page: `WHERE (due_on, id) > (:last_due_on, :last_id) ORDER BY due_on, id LIMIT 50`.
Given an index on `(due_on, id)`, this is a single seek to the right starting point followed
by reading exactly 50 rows forward — constant-time regardless of how deep into the result set
you are, and it's exactly what `ORDER BY ... LIMIT` matching an index looks like in a plan: no
separate `Sort` node at all, because the index already produces rows in the required order.
The tradeoff is real: no jumping to an arbitrary page number, and the client needs to carry
the last-seen key forward — fine for infinite-scroll and API pagination, wrong for a page
picker with numbered links.

## The interview version of this lesson

"How would you find out why this query is slow?" has a fairly fixed good answer: run
`EXPLAIN (ANALYZE, BUFFERS)`, compare estimated vs. actual rows at each node, look for the
three smells above, check whether the filtered/joined columns are indexed and whether an
existing index's column order actually matches the query (next lesson step), and confirm
`ANALYZE` has run recently on the tables involved. That's the checklist the next concept step
and both exercises are building toward.

## Further reading (optional)

- [PostgreSQL docs: Using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html)
- [PostgreSQL docs: Planner cost constants](https://www.postgresql.org/docs/current/runtime-config-query.html#RUNTIME-CONFIG-QUERY-CONSTANTS)
- [use-the-index-luke.com: Fetch, sort, or search?](https://use-the-index-luke.com/sql/anatomy)
- [use-the-index-luke.com: Pagination done the PostgreSQL way](https://use-the-index-luke.com/no-offset)
