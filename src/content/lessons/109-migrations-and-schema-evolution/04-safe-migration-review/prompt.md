# Review a migration batch before it ships

`migrations` holds eight proposed migrations for a live project-management schema. Grade
each one with this rubric and produce a `migration_review(migration_id, verdict, reason)`
view, one row per migration:

- **`safe`** — no table scan, no lock that blocks reads or writes for longer than a
  metadata update. Ship it as written.
- **`needs-lock-timeout`** — the statement itself is fine, but it takes `ACCESS EXCLUSIVE`
  even briefly, so it must run with `lock_timeout` set first: fail fast if the lock isn't
  free, instead of queuing behind another transaction and blocking every query behind it.
- **`rewrite-required`** — forces a full table rewrite, or holds a lock/does a scan whose
  duration scales with table size. Redesign it (new column + backfill + swap, `CONCURRENTLY`,
  or a batched backfill) instead of running it as written.
- **`unsafe`** — will error, or breaks a live consumer, regardless of locking strategy. Do
  not ship it as written under any circumstances.

`reason` can be any non-empty text explaining the call — it isn't graded on exact wording,
`verdict` is.

You also need two things the batched migrations above depend on:

1. **`next_batch(last_id int, size int) returns table(id int)`** — the next
   keyset-paginated page of ids from `big_rows`, ordered by `id`, strictly greater than
   `last_id`, at most `size` rows. This is the query a Go backfill job would call
   repeatedly (`next_batch(0, 10)`, then `next_batch(<max id returned>, 10)`, ...) until it
   comes back empty.

2. **A real, safe `NOT NULL` migration on `orgs.slug`.** Four orgs exist; two have a null
   `slug`. Bring the column to `NOT NULL` the way the "changing a live table" concept
   describes it: backfill the nulls to a derived value (lowercase the org name, replacing
   anything that isn't a letter or digit with a hyphen), add a temporary `NOT VALID` check
   that the column isn't null, validate it, then `SET NOT NULL`, then drop the temporary
   check — it's redundant once the column itself enforces `NOT NULL`.
