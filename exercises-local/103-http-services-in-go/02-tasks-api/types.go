package tasksapi

import "errors"

// Task is the unit the whole API works with: a piece of work inside a
// project. json tags control the wire shape the client sees, independent of
// the Go field names.
type Task struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	Status    string `json:"status"`
	ProjectID string `json:"projectId"`
}

// Store is the persistence seam. NewServer takes one so handlers never talk
// to storage directly -- swap MemStore for a Postgres-backed implementation
// without touching a single handler.
type Store interface {
	List(projectID string) ([]Task, error)
	Get(id string) (Task, error)
	Create(t Task) (Task, error)
	UpdateStatus(id, status string) (Task, error)
}

// ErrNotFound is returned by Store methods when the id doesn't exist.
// Handlers translate it to 404; every other error becomes a 500.
var ErrNotFound = errors.New("not found")
