`wouldCreateCycle(tasks, from, to)` is asking "if I add the edge `from -> to`, does `to`
already have a path back to `from`?" Do a graph search (DFS or BFS) from `to`, following each
task's existing `dependsOn` edges, and see if you ever reach `from`. Handle `from === to` as an
immediate cycle before you search.

---

`findCyclePath` doesn't need new logic — reuse the same search, but this time record the path
instead of just a boolean. Search from `to` toward `from`, then put `from` back on the front:
the result reads as `[from, to, ..., from]`, a closed loop.

---

Keep the select **controlled with `value=""`** and add on `onChange` rather than tracking a
"currently selected" piece of state — that way the select visually resets after every pick,
successful or not, with no extra effort. Filter the `<option>`s to exclude the task itself and
anything already in its `dependsOn`.

---

For the inline error, store `Record<taskId, string>` in state (empty string or absent = no
error) and clear that task's entry on a successful add. Join the cycle path's titles with
`' → '` (U+2192) for the message. Use `role="alert"` so `findByRole`/`getByRole` can find it
without depending on exact markup.
