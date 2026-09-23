create view plan_diagnosis (plan_id, smell, fix) as
select 1, 'seq-scan-large', 'add-index'
union all
select 2, 'row-estimate-off', 'analyze'
union all
select 3, 'sort-spill', 'increase-work_mem-or-index'
union all
select 4, 'nested-loop-inner-seq', 'rewrite-join'
union all
select 5, 'fine', 'none';

create index idx_vendor_events_payload on vendor_events using gin (payload);

create function jsonb_events_by_vendor(v text) returns setof int as $$
  select id from vendor_events where payload @> jsonb_build_object('vendor', v)
$$ language sql stable;
