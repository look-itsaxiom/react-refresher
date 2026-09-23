create table plans (
  id int primary key,
  name text not null,
  plan text not null
);

insert into plans (id, name, plan) values
(1, 'assignee lookup, no index', $plan$Seq Scan on tasks  (cost=0.00..48912.00 rows=41 width=64) (actual time=0.015..812.442 rows=41 loops=1)
  Filter: (assignee_id = 42)
  Rows Removed by Filter: 3999959
Planning Time: 0.112 ms
Execution Time: 813.017 ms$plan$),
(2, 'projects by org, stale stats', $plan$Index Scan using idx_projects_org on projects  (cost=0.29..8.31 rows=1 width=48) (actual time=0.045..14.823 rows=6210 loops=1)
  Index Cond: (org_id = 12)
Planning Time: 0.081 ms
Execution Time: 15.240 ms$plan$),
(3, 'monthly report, order by total', $plan$Sort  (cost=98234.12..98459.87 rows=90300 width=72) (actual time=1204.331..1389.560 rows=90300 loops=1)
  Sort Key: total_amount DESC
  Sort Method: external merge  Disk: 8624kB
  ->  Seq Scan on invoices  (cost=0.00..42110.00 rows=90300 width=72) (actual time=0.021..302.114 rows=90300 loops=1)
        Filter: (billed_on >= '2026-01-01'::date)
Planning Time: 0.095 ms
Execution Time: 1401.223 ms$plan$),
(4, 'tasks per project, one query per project', $plan$Nested Loop  (cost=0.29..184320.55 rows=1 width=90) (actual time=0.062..2245.117 rows=240 loops=1)
  ->  Index Scan using projects_pkey on projects  (cost=0.29..8.31 rows=1 width=8) (actual time=0.018..0.412 rows=240 loops=1)
        Index Cond: (org_id = 3)
  ->  Seq Scan on tasks  (cost=0.00..767.00 rows=1 width=82) (actual time=0.004..3.719 rows=1 loops=240)
        Filter: (project_id = projects.id)
        Rows Removed by Filter: 19759
Planning Time: 0.088 ms
Execution Time: 2245.980 ms$plan$),
(5, 'overdue tasks, already indexed', $plan$Bitmap Heap Scan on tasks  (cost=4.46..56.54 rows=17 width=47) (actual time=0.020..0.041 rows=16 loops=1)
  Recheck Cond: ((project_id = 7) AND (status = 'todo'::text) AND (deleted_at IS NULL))
  ->  Bitmap Index Scan on idx_tasks_project_status_due  (cost=0.00..4.46 rows=17 width=0) (actual time=0.012..0.012 rows=16 loops=1)
        Index Cond: ((project_id = 7) AND (status = 'todo'::text))
Planning Time: 0.061 ms
Execution Time: 0.058 ms$plan$);

create table vendor_events (
  id int generated always as identity primary key,
  payload jsonb not null
);

insert into vendor_events (payload)
select jsonb_build_object('vendor', 'v' || (g % 100), 'amount', (g % 500) + 1)
from generate_series(1, 20000) g;

analyze vendor_events;
