Both TODO handlers follow the exact shape of `listTasks`/`createTask`: pull path values with
`r.PathValue(...)`, call one `Store` method, then either `writeError` or `writeJSON`. Look at
those two working handlers before writing anything.

---

For `readyTasks`, the whole body is two lines: call `store.Ready(r.Context(),
r.PathValue("projectID"))`, then write it with `writeJSON(w, http.StatusOK, tasks)` after the
same `if tasks == nil { tasks = []Task{} }` guard `listTasks` uses -- a JSON `null` list is a
common bug a reviewer will notice.

---

For `addDependency`, decode into a struct with one field, `PredecessorID string
\`json:"predecessorId"\`` (it's already defined above the stub in `server.go`). Validate it's
non-empty before calling the store -- an empty predecessor id would otherwise reach
`store.AddDependency` and come back as a confusing `404` instead of a clear `400`.

---

Translate the store's error with `errors.Is`, not `==` -- `ErrNotFound` and `ErrCycle` are
sentinel errors declared in `store.go`, and `errors.Is` is the correct comparison even though
neither is wrapped here:

```go
err := store.AddDependency(r.Context(), body.PredecessorID, r.PathValue("id"))
switch {
case err == nil:
	w.WriteHeader(http.StatusNoContent)
case errors.Is(err, ErrNotFound):
	writeError(w, http.StatusNotFound, "not_found", "predecessor or successor task not found")
case errors.Is(err, ErrCycle):
	writeError(w, http.StatusConflict, "cycle", "that dependency would create a cycle")
default:
	writeError(w, http.StatusInternalServerError, "internal_error", "could not add dependency")
}
```

Don't forget to add `"errors"` to the import block once you use `errors.Is`.
