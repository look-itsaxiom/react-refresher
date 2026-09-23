# Make these queries fast

`tasks` has 20,000 rows (seeded for you, `ANALYZE`d already) and no indexes. Write `CREATE
INDEX` statements in `query.sql` so each of these four queries uses an index scan instead of
a sequential scan on `tasks`, and add one uniqueness constraint.

**Q1**
```sql
select * from tasks
where project_id = 7 and status = 'todo' and deleted_at is null
order by due_on limit 20;
```

**Q2**
```sql
select id, title, status, due_on from tasks
where assignee_id = 42 and deleted_at is null;
```

**Q3**
```sql
select count(*) from tasks
where created_at >= date '2026-09-01' and created_at < date '2026-10-01';
```

**Q4** (keyset pagination — the next page after `due_on = 2026-09-15, id = 100`)
```sql
select id, due_on from tasks
where (due_on, id) > (date '2026-09-15', 100)
order by due_on, id limit 50;
```

**Uniqueness:** exactly one *open* task per `(project_id, title)`. Inserting a task with the
same title in the same project should fail while an earlier one with that title is still
open (`deleted_at is null`), but should succeed once the earlier one is soft-deleted.

Think about column order before you write each index: which columns are filtered by
equality, which by a range, and which only need to come out sorted. A wrong-order composite
index can fail to serve a query even though every column it needs is technically in there
somewhere.
