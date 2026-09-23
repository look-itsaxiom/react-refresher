//go:build !solution

package takehome

import (
	"encoding/json"
	"net/http"
)

// NewServer wires the task routes onto a fresh mux backed by store.
//
// GET/POST /projects/{projectID}/tasks are done for you -- read them to see
// the response shape the graders expect. Your job is the other two:
//
//   - POST /tasks/{id}/dependencies    -> decode {"predecessorId": "..."},
//     call store.AddDependency, and translate the result: nil -> 204,
//     ErrNotFound -> 404, ErrCycle -> 409 with the error envelope below.
//   - GET  /projects/{projectID}/ready -> call store.Ready and write the
//     result as a JSON list (empty array, not null, when there are none).
func NewServer(store Store) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /projects/{projectID}/tasks", listTasks(store))
	mux.HandleFunc("POST /projects/{projectID}/tasks", createTask(store))
	mux.HandleFunc("POST /tasks/{id}/dependencies", addDependency(store))
	mux.HandleFunc("GET /projects/{projectID}/ready", readyTasks(store))

	return mux
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// writeError writes the shared error envelope every handler in this API
// uses: {"error": {"code": "...", "message": "..."}}.
func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, map[string]any{
		"error": map[string]string{"code": code, "message": message},
	})
}

func listTasks(store Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		projectID := r.PathValue("projectID")

		tasks, err := store.ListTasks(r.Context(), projectID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal_error", "could not list tasks")
			return
		}
		if tasks == nil {
			tasks = []Task{}
		}
		writeJSON(w, http.StatusOK, tasks)
	}
}

type createTaskRequest struct {
	Title string `json:"title"`
}

func createTask(store Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		projectID := r.PathValue("projectID")

		var body createTaskRequest
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Title == "" {
			writeError(w, http.StatusBadRequest, "invalid_title", "title is required")
			return
		}

		created, err := store.CreateTask(r.Context(), Task{Title: body.Title, ProjectID: projectID, Status: "todo"})
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal_error", "could not create task")
			return
		}
		w.Header().Set("Location", "/tasks/"+created.ID)
		writeJSON(w, http.StatusCreated, created)
	}
}

// addDependencyRequest is the body POST /tasks/{id}/dependencies expects.
// The path's {id} is the successor (the task that has to wait); the body
// names the predecessor (the task it waits on).
type addDependencyRequest struct {
	PredecessorID string `json:"predecessorId"`
}

// TODO: decode addDependencyRequest, validate PredecessorID is non-empty,
// call store.AddDependency(r.Context(), body.PredecessorID, r.PathValue("id")),
// and map the result to a status code and body as described above.
func addDependency(store Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotImplemented)
	}
}

// TODO: call store.Ready(r.Context(), r.PathValue("projectID")) and write
// the result the same way listTasks does.
func readyTasks(store Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotImplemented)
	}
}
