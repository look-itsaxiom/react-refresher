create table migrations (
  id int primary key,
  name text not null,
  sql text not null
);

insert into migrations (id, name, sql) values
  (1, 'add nullable notes column',
     'alter table tasks add column notes text'),
  (2, 'set assignee not null directly, no backfill',
     'alter table tasks alter column assignee_id set not null'),
  (3, 'create index on big_rows.status (47m rows), no concurrently',
     'create index on big_rows (status)'),
  (4, 'create index concurrently on big_rows.status (47m rows)',
     'create index concurrently on big_rows (status)'),
  (5, 'add nonnegative check on tasks.priority, not valid',
     'alter table tasks add constraint chk_priority check (priority >= 0) not valid'),
  (6, 'widen tasks.id from int to bigint',
     'alter table tasks alter column id type bigint'),
  (7, 'drop tasks.legacy_status, still read by the deployed API',
     'alter table tasks drop column legacy_status'),
  (8, 'backfill tasks.priority for every row in one statement',
     'update tasks set priority = 0 where priority is null');

create table orgs (
  id int primary key,
  name text not null,
  slug text
);

insert into orgs (id, name, slug) values
  (1, 'Acme', 'acme'),
  (2, 'Bolt Co', null),
  (3, 'Circle Inc', null),
  (4, 'Delta LLC', 'delta-llc');

-- Stands in for a large table a batched backfill would page through.
create table big_rows (id int primary key);
insert into big_rows select generate_series(1, 47);
