Write two small helpers first, `writeJSON(w, status, v)` and `writeError(w, status, code, message)`.
Every handler is then a few lines calling one of the two. Remember: set `Content-Type` and call
`WriteHeader` before you write any body bytes.

---

For `POST` and `PATCH`, decode with `json.NewDecoder(r.Body)` and call `dec.DisallowUnknownFields()`
before `Decode`. A decode error (malformed JSON *or* an unknown field, since `DisallowUnknownFields`
turns that into a decode error too) is your 400 case for both routes.

---

`r.PathValue("projectID")`, `r.PathValue("id")` read the wildcard segments from the route pattern.
You don't need to parse the URL path yourself.

---

For "does this task exist," call the store method and check `errors.Is(err, ErrNotFound)`. Any
other non-nil error is a 500 with a generic message -- don't leak the underlying error string to
the client.

---

For the empty-list case: `MemStore.List` can return a nil slice when there are no matches, and
`json.Marshal(nil slice)` produces `null`, not `[]`. Convert a nil result to `[]Task{}` before
encoding so callers always get an array back.

---

Near-solution shape for `createTask`:

```go
func createTask(store Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		projectID := r.PathValue("projectID")

		var body struct{ Title string `json:"title"` }
		r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
		dec := json.NewDecoder(r.Body)
		dec.DisallowUnknownFields()
		if err := dec.Decode(&body); err != nil {
			writeError(w, http.StatusBadRequest, "invalid_body", "...")
			return
		}
		if body.Title == "" {
			writeError(w, http.StatusBadRequest, "invalid_title", "...")
			return
		}

		created, err := store.Create(Task{Title: body.Title, Status: "todo", ProjectID: projectID})
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal_error", "...")
			return
		}
		w.Header().Set("Location", "/tasks/"+created.ID)
		writeJSON(w, http.StatusCreated, created)
	}
}
```

The other three handlers follow the same shape: decode/validate (if there's a body), call the
store, translate `ErrNotFound` and other errors, write the response.
