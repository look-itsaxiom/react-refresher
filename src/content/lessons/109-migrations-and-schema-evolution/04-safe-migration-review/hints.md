Build `migration_review` as a `create view ... as select ... from (values (1, 'safe',
'...'), (2, 'unsafe', '...'), ...) as v(id, verdict, reason)`. It's just a lookup table
of your judgment calls, one row per migration id — you don't need to parse the `sql`
column at all.

---

Walk the eight migrations one at a time against the rubric. The two that error or break
a live reader regardless of timing are `unsafe`. The ones that rewrite the whole table,
or hold a lock/do a scan proportional to table size, are `rewrite-required`. An instant
metadata-only change is `safe` on its own but `needs-lock-timeout` if you want to guard
against queuing behind another transaction — apply that consistently to every plain
`ALTER TABLE` that isn't `CONCURRENTLY` or `NOT VALID`.

---

`next_batch`: `select id from big_rows where id > last_id order by id limit size` as a
one-line SQL function (`language sql stable`). No need for `plpgsql` here.

---

For `orgs.slug`: `regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')` turns `'Bolt Co'`
into `'bolt-co'`. Run that `update ... where slug is null` first, before touching the
column's nullability at all.

---

The `NOT NULL` sequence, in order: `update` the nulls away, `add constraint ... check
(slug is not null) not valid`, `validate constraint`, `alter column slug set not null`,
then `drop constraint`. Doing `set not null` before the backfill is the direct route to
an error on the existing null rows — that's exactly the pattern that made migration 2
`unsafe`.
