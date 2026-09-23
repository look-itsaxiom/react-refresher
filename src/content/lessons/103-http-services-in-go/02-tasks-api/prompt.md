# Build the tasks API

`NewServer(store Store) http.Handler` wires four routes onto a mux, but every handler currently
responds `501 Not Implemented`. Implement them against the provided `Store` interface and
`MemStore` (already complete -- you don't touch storage, only the HTTP layer).

```go
type Task struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	Status    string `json:"status"`
	ProjectID string `json:"projectId"`
}

type Store interface {
	List(projectID string) ([]Task, error)
	Get(id string) (Task, error)
	Create(t Task) (Task, error)
	UpdateStatus(id, status string) (Task, error)
}
```

Routes to implement:

- **`GET /projects/{projectID}/tasks`** -- 200 with a JSON array (an empty array, not `null`,
  when there are no tasks for that project).
- **`POST /projects/{projectID}/tasks`** -- body `{"title": "..."}`. 400 with an error envelope
  on malformed JSON, an unknown field, or an empty title. On success: 201, a `Location: /tasks/{id}`
  header, and the created task (default status `"todo"`) as the body.
- **`GET /tasks/{id}`** -- 200 with the task, or 404 with an error envelope if it doesn't exist.
- **`PATCH /tasks/{id}/status`** -- body `{"status": "..."}`. 400 on malformed JSON, 422 if the
  status isn't one of `todo`, `doing`, `done`, 404 if the task doesn't exist. 200 with the updated
  task on success.

Use this error envelope shape for every failure:

```json
{ "error": { "code": "some_code", "message": "a human-readable message" } }
```

The routes are already registered, so a wrong method against a known path returns 405 with an
`Allow` header for free -- that's the mux, not something you write.

Run `go test ./...` inside this exercise's folder to check your work.
