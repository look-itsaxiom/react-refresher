# Fix five views that almost answer the question

`query.sql` (seeded from `starter.sql`) defines five views over `users`, `projects`,
`tasks`, and `status_changes`. Every reference date is the literal `date '2026-09-21'`
— never `current_date` or `now()`.

Each view has exactly one bug. Fix each one **in place** — keep the view names and
column names exactly as given, since the checks query them by name.

1. **`project_progress(project_id, name, total, done, done_pct)`** — `done_pct` is
   `100.0 * done / total`, rounded to 1 decimal place with `round(..., 1)`.
2. **`assignee_load(assignee_id, name, open_tasks, open_minutes)`** — every user
   appears, including one with zero open tasks, ordered by `open_minutes` descending.
3. **`overdue_tasks(id, title, project_id, days_overdue)`** — tasks that are not
   `done` and whose `due_on` is before `2026-09-21`; `days_overdue` is the day count
   between `due_on` and that reference date.
4. **`latest_status(task_id, status, changed_at)`** — the single most recent
   `status_changes` row per task.
5. **`daily_completions(day, completed, running_total)`** — one row per day that had
   at least one task marked `done`, with `completed` for that day and `running_total`
   as a true cumulative sum in day order.

Run the file to see each view's current (wrong) output before you touch anything.
