//go:build solution

package takehome

import (
	"encoding/json"
	"errors"
	"net/http"
)

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

type addDependencyRequest struct {
	PredecessorID string `json:"predecessorId"`
}

func addDependency(store Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		successorID := r.PathValue("id")

		var body addDependencyRequest
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.PredecessorID == "" {
			writeError(w, http.StatusBadRequest, "invalid_body", "predecessorId is required")
			return
		}

		err := store.AddDependency(r.Context(), body.PredecessorID, successorID)
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
	}
}

func readyTasks(store Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		projectID := r.PathValue("projectID")

		tasks, err := store.Ready(r.Context(), projectID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal_error", "could not compute ready tasks")
			return
		}
		if tasks == nil {
			tasks = []Task{}
		}
		writeJSON(w, http.StatusOK, tasks)
	}
}
