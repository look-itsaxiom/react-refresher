`visible_projects` needs two source queries combined with `union`: one from `memberships`
joined to `projects` on `org_id` (access = `'member'`), and one from `project_shares` joined
to `memberships` on `org_id` (a user sees a share if *their org* is the org the project was
shared with) joined to `projects` (access = the share's role). `union`, not `union all` — if
a user could reach the same project through both paths you don't want a duplicate row, even
though this seed data never creates that case.

---

`project_shares.role` is a `share_role` enum and the membership branch's literal is a `text`
string (`'member'`) — Postgres won't let a plain `union` combine an enum column with a text
literal without a cast. Cast the enum side: `s.role::text as access`.

---

`count(*) filter (where t.status = 'todo')` counts only the rows matching the filter,
computed once per group in the same aggregate query — no `case when ... then 1 else 0 end`
needed, and no five separate `count(*) where status = ...` subqueries.

---

`can_edit_task` is two `exists (...)` checks joined by `or`: the first checks a direct
membership in the task's project's owning org with `role in ('owner', 'admin', 'member')`;
the second checks a membership in an org that holds an `'editor'` share on the task's
project. Both checks need to get from `p_task` to a project (`join projects p on p.id =
t.project_id` in the first, `join project_shares s on s.project_id = t.project_id` in the
second) and then to `p_user` through `memberships`.
