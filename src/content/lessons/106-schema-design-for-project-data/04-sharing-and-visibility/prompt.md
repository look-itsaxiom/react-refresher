# Sharing and visibility

`seed.sql` rebuilds the schema from the previous exercise and seeds it: two organizations
(Acme, Vendor Co), four users, their memberships, two projects owned by Acme (`Radar Upgrade`
and `Site Survey`), and one share — `Radar Upgrade` shared with Vendor Co as a `viewer`.
`Site Survey` isn't shared with anyone. Your `query.sql` defines two views and one function
against that schema:

- `view visible_projects (user_id, project_id, access)` — every project a user can see,
  through either path: membership in the owning org (`access = 'member'`), or a share
  granted to an org they belong to (`access` = the share's role, `'editor'` or `'viewer'`).
  A user who is both a member of the owning org *and* has access through a share should
  appear once per project, not twice — but this schema's seed data never puts a user in that
  position, so you don't need to de-duplicate for it to pass.
- `view task_counts_by_project (project_id, todo, doing, blocked, done, total)` — one row per
  project with a count of tasks in each status, plus the total, using conditional
  aggregation (`count(*) filter (where ...)`) rather than five separate queries.
- `function can_edit_task(p_user uuid, p_task uuid) returns boolean` — true if `p_user` can
  edit `p_task`: either they're a member of the task's project's owning org with role
  `'owner'`, `'admin'`, or `'member'` (not `'viewer'`), or their org has an `'editor'` share
  on the task's project (not a `'viewer'` share). False for everyone else, including a user
  whose org has no relationship to the project at all.

The starter compiles but gets all three wrong: `visible_projects` only checks membership, so
a shared project never shows up for the org it was shared with; `task_counts_by_project`
dumps every task into `todo` and never counts `doing`; `can_edit_task` ignores role, so a
viewer can "edit."
