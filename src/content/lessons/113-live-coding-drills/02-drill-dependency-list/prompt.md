**Time target: 25 minutes.**

Build `DependencyEditor` for a hardware program's task list. This is exactly the kind of
prompt you'd get live: a requirement list read aloud, then "go."

## Requirements

- `data.ts` exports `Task = { id: string; title: string; dependsOn: string[] }`, a fixture
  array `tasks`, and a `done: Set<string>` of completed task ids. Don't edit `data.ts`.
- Render every task in `tasks` as a list item showing its title and its current dependencies
  (by title, not id).
- Each task has a `<select>` for adding a new dependency (options: every other task, by
  title) and a remove button per existing dependency.
- Adding a dependency that would create a cycle is rejected: don't add it, and show an inline
  error naming the full cycle path (e.g. `"Order components → Design PCB → Order components"`).
- Export two pure functions from your entry file so they're independently testable:
  `wouldCreateCycle(tasks, from, to): boolean` — would adding "`from` depends on `to`" create
  a cycle? — and `findCyclePath(tasks, from, to): string[]` — the task ids around that cycle,
  starting and ending at `from`.
- A task whose every dependency id is in `done` shows a "Ready" badge.
- Keyboard accessible: real `<button>` elements for removal, and `aria-label`s that include
  the task's title (e.g. `aria-label="Remove dependency on Design PCB from Order components"`,
  `aria-label="Add dependency for Assemble board"`), so two tasks' controls are never confused
  by a screen reader or by `getByLabelText`.

## Interviewer follow-ups

The checks below probe these, in the order an interviewer would ask them:

1. Does `wouldCreateCycle` catch a direct cycle (A → B, then try B → A)?
2. Does it catch a transitive cycle (A → B → C, then try C → A)?
3. Does it catch someone depending on themselves?
4. Does the UI actually block the add and explain why, not just reject silently?
5. Do dependencies removed with the remove button actually come off the list (and can a
   previously-blocked cycle be added after the blocking edge is removed)?
6. Is the "Ready" badge correct for a task with no dependencies, one with all dependencies
   done, and one with an unfinished dependency?
7. Are the controls actually operable by role and label, not just by CSS class or test id?
