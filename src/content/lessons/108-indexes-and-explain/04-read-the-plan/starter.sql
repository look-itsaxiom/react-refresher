-- Part 1: read the five captured plans in `plans` and diagnose each one.
-- Create a view named plan_diagnosis(plan_id, smell, fix) with exactly one
-- row per plan (see prompt.md for the plan texts and the fixed vocabulary).

-- TODO: create view plan_diagnosis as ...

-- Part 2: vendor_events(id, payload jsonb) has 20,000 rows. Add a GIN index
-- on payload, then create a function that returns the ids whose payload
-- contains the given vendor.

-- TODO: create index ... on vendor_events using gin (payload);
-- TODO: create function jsonb_events_by_vendor(v text) returns setof int as $$ ... $$ language sql stable;
