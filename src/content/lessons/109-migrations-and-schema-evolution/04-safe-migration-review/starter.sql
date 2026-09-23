-- TODO: create view migration_review(migration_id, verdict, reason) with one
-- row per row in `migrations`, verdict in
-- ('safe', 'needs-lock-timeout', 'rewrite-required', 'unsafe') per the rubric
-- in the prompt.

-- TODO: create or replace function next_batch(last_id int, size int)
-- returns table(id int) — the next keyset-paginated batch of ids from
-- big_rows, ordered by id, strictly greater than last_id.

-- TODO: bring orgs.slug to NOT NULL the safe way — backfill nulls to a
-- derived value, add a NOT VALID check, validate it, then SET NOT NULL,
-- then drop the now-redundant check.
