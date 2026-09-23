# Choosing indexes

The previous step read plans. This one designs the indexes that produce good ones — the
part of the interview question that's actually about judgment, not just tool familiarity.

## Composite indexes and column order

A multicolumn (composite) B-tree index stores rows sorted by its first column, then its
second column within each value of the first, and so on — the same idea as `ORDER BY a, b,
c`. That makes column order a design decision, governed by a standard rule of thumb:
**equality columns first, then one range column, then columns you need sorted output on.**
An equality condition on a leading column narrows the B-tree walk to a contiguous range
immediately; a range condition can only narrow *after* every equality column before it is
pinned, which is why a range column belongs after the equality columns, not before them; and
once the equality and range columns have narrowed things down, having the sort column next in
the index means the remaining rows come out already ordered, avoiding a separate `Sort` node.

The **leftmost-prefix rule** governs which queries an index can serve at all: an index on
`(a, b, c)` can be used for a query filtering on `a` alone, on `a` and `b`, or on `a`, `b`,
and `c` — but not for a query filtering on `b` or `c` alone, because the index isn't sorted
by `b` independent of `a`. This is why a composite index built for one query's column order
often can't serve a different query that skips the leading column, and why "just add an
index" without checking which queries need to hit which column combinations produces indexes
that quietly don't get used.

## Partial indexes

`CREATE INDEX ... ON tasks (assignee_id) WHERE deleted_at IS NULL` indexes only the rows
matching the `WHERE` clause — a **partial index**. Two uses come up constantly in a
multi-tenant project-management schema like the one from lesson 106:

- **Hot-subset indexing.** Most queries in a task tracker care about open, non-deleted work,
  which is a small fraction of a table that accumulates years of `done` rows. A partial
  index `WHERE status != 'done' AND deleted_at IS NULL` (or narrower) stays small and cheap
  to maintain relative to indexing every row, most of which no query filters for.
- **Uniqueness with soft deletes.** A plain `UNIQUE (project_id, title)` constraint would
  reject a new task with the same title as one that was soft-deleted months ago, which is
  usually wrong. `CREATE UNIQUE INDEX ... ON tasks (project_id, title) WHERE deleted_at IS
  NULL` enforces uniqueness only among *live* rows — soft-deleted rows stop counting.

## Covering indexes and the visibility map

`CREATE INDEX ... ON tasks (assignee_id) INCLUDE (status)` stores `status` inside the index
alongside the indexed `assignee_id`, without making `status` part of the sort key. If a query
only needs `assignee_id` (to filter) and `status` (to select) and nothing else, every column
it needs is now present in the index — a **covering index**. The payoff, in principle, is an
**Index Only Scan**: Postgres can answer the query from the index alone, skipping the heap
entirely for rows the **visibility map** marks all-visible (a bitmap tracking which heap pages
have no rows invisible to any in-progress transaction, maintained by vacuum). In practice, the
planner still has to choose that plan shape over the alternatives, and at moderate row counts
and selectivity it frequently prefers a **Bitmap Heap Scan** instead — which still uses the
index to find candidate pages, just doesn't skip the heap visit. Don't be surprised to see
`Bitmap Heap Scan` where you expected `Index Only Scan`; it's usually still the right choice,
and PGlite's planner in this lesson's own exercises leans toward it more than a full Postgres
server does at these row counts. `INCLUDE` columns add write cost and index size like any
index does, so only add columns a specific hot query actually selects.

## Expression indexes

`CREATE INDEX ON users (lower(email))` indexes the *result* of an expression, not a raw
column. It only helps a query that filters on the identical expression —
`WHERE lower(email) = lower($1)` matches; `WHERE email = $1` does not. The classic use is
case-insensitive lookups on a column you don't want to force lowercase at write time.

## GIN indexes: jsonb, arrays, and full-text

B-trees index scalar, orderable values. **GIN** (Generalized Inverted Index) indexes
*composite* values by mapping each of their inner elements back to the rows containing them
— structurally like a search engine's inverted index. Three uses matter for a schema with
`jsonb` metadata and free-text search:

- **`jsonb` containment.** `CREATE INDEX ... USING gin (payload)` supports
  `payload @> '{"vendor": "acme"}'` — "does this jsonb value contain this jsonb value" —
  which is the standard way to filter on semi-structured attributes without giving each one
  its own column.
- **Arrays.** `CREATE INDEX ... USING gin (tags)` on a `text[]` column supports
  `tags @> ARRAY['urgent']` the same way.
- **Full-text search.** `CREATE INDEX ... USING gin (to_tsvector('english', body))` supports
  `to_tsvector('english', body) @@ to_tsquery('english', 'fox & jumps')` — genuine
  language-aware search (stemming, stop words), not `LIKE`.

None of this is `LIKE '%text%'` support. `pg_trgm` (trigram indexing) is the extension that
makes `column LIKE '%substring%'` and fuzzy `similarity()` matching index-friendly, via a GIN
or GiST index on trigrams of the column's text — genuinely worth knowing for an interview, but
it isn't loaded in this course's sandbox, so you won't exercise it here; know it exists and
what it's for.

## BRIN, for a different kind of table

**BRIN** (Block Range Index) stores, per range of physical table pages, just the min/max of
the indexed column — tiny compared to a B-tree, at the cost of being useless unless the
column correlates with physical row order. That describes an append-only, timestamp-ordered
table (event logs, time-series metrics) almost exactly: rows are written in timestamp order
and never reordered, so a BRIN index on the timestamp column answers range queries with a
fraction of a B-tree's storage cost. Wrong choice for a column with no such correlation.

## What an index costs

Every index is maintained on every `INSERT`, `UPDATE` of an indexed column, and `DELETE` —
this is **write amplification**, and it's the reason "index everything" is wrong advice.
Indexes also consume disk (and cache) space, sometimes exceeding the table itself. In a real
Postgres instance, `pg_stat_user_indexes.idx_scan` tells you which indexes are actually being
used — an index with `idx_scan = 0` after a representative period of production traffic is a
pure cost with no benefit, and dropping it is usually correct. PGlite (this course's sandbox
engine) doesn't implement `pg_stat_*` activity views, so you can't run that check here —
know the query exists and what it answers, even without a place to run it in this lesson.

One column almost always needs an index and frequently doesn't have one by default:
**foreign key columns.** Postgres does not automatically index the referencing side of a
foreign key (only the referenced primary/unique key is indexed). Every `DELETE` or `UPDATE`
of a referenced row has to check for referencing rows to enforce the constraint — without an
index on the FK column, that check is a sequential scan of the referencing table, and it gets
slower as that table grows.

## The database side of N+1

The N+1 problem usually gets introduced as an application-layer bug — a loop that issues one
query per item instead of one batched query — but it's worth naming its database-level shape
directly, because it's what a Nested-Loop-with-Seq-Scan-inner plan smell (previous step)
actually *is* at the SQL level: many small, individually-indexed lookups where one batched
query would do. `WHERE id = ANY($1::int[])` or `WHERE id IN (1, 2, 3, ...)` turns N single-row
lookups into one query the planner can satisfy with a single Bitmap Index Scan across all the
requested ids — the index is still doing the work, just once instead of N times. This is
exactly what a GraphQL **DataLoader** does at the application layer: it collects the ids
requested during one tick of the event loop and issues a single batched `WHERE id = ANY($1)`
instead of N round trips — batching is the fix on both sides of the boundary, and the two
techniques are the same idea at two layers. [Lesson 110](/) covers DataLoader itself; this is
the SQL it ultimately runs.

## A checklist for reviewing a slow query, interview-ready

1. Run `EXPLAIN (ANALYZE, BUFFERS)`. Read bottom-up.
2. Compare estimated vs. actual rows at each node; a large gap points at stale statistics or
   an unmodeled correlation.
3. For any `Seq Scan` on a large table: is there a selective filter that isn't indexed, or a
   composite index whose column order doesn't match this query's leading conditions?
4. For any `Nested Loop`: is the inner side an indexed lookup, or a scan re-run once per
   outer row?
5. For any `Sort`: did it spill to disk, and would an index matching the `ORDER BY` avoid it?
6. Is `ANALYZE` current on the tables involved?
7. Would this query benefit from becoming one batched query instead of many — the N+1 check?

## Further reading (optional)

- [PostgreSQL docs: Indexes](https://www.postgresql.org/docs/current/indexes.html)
- [PostgreSQL docs: GIN indexes](https://www.postgresql.org/docs/current/gin.html)
- [PostgreSQL docs: BRIN indexes](https://www.postgresql.org/docs/current/brin.html)
- [PostgreSQL docs: pg_trgm](https://www.postgresql.org/docs/current/pgtrgm.html)
- [use-the-index-luke.com: The clustering factor](https://use-the-index-luke.com/sql/clustering)
