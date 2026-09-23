`project_progress`'s `done_pct` divides two integers before multiplying by 100 —
integer division truncates the fraction to 0 before the `* 100` ever runs. Multiply
by `100.0` (a numeric literal) first, or cast one side, so the division happens in
floating/numeric arithmetic, then wrap the whole thing in `round(..., 1)`.

---

`assignee_load` uses a plain `JOIN` from `users` to `tasks`. A user with zero tasks
assigned has no matching row on the right, so an inner join drops that user's row
entirely instead of producing one with `open_tasks = 0`. Switch to `LEFT JOIN` and
make sure the two aggregates use `coalesce(..., 0)` so a user with no task rows at
all shows zeros instead of `NULL`.

---

`overdue_tasks` is missing a condition on `status`. A task that's already `done` can
still have a `due_on` in the past — that's not overdue, it just finished. Add
`t.status <> 'done'` back to the `WHERE` clause alongside the date comparison.

---

`latest_status` uses `DISTINCT ON (task_id)` correctly, but `DISTINCT ON` keeps the
*first* row per group according to whatever `ORDER BY` you give it — ascending order
means "first" is the earliest row. Sort by `changed_at desc` so the row `DISTINCT ON`
keeps is the most recent one, not the oldest.

---

`daily_completions`'s `running_total` just repeats `completed` — it was never turned
into a running sum. Compute the per-day counts in one step (a subquery or a CTE),
then apply `sum(completed) over (order by day rows between unbounded preceding and
current row)` over that result to get a true cumulative total.
