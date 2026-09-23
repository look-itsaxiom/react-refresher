//go:build solution

package tasksapi

import (
	"encoding/json"
	"errors"
	"net/http"
)

type errorEnvelope struct {
	Error errorBody `json:"error"`
}

type errorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(errorEnvelope{Error: errorBody{Code: code, Message: message}})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func NewServer(store Store) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /projects/{projectID}/tasks", listTasks(store))
	mux.HandleFunc("POST /projects/{projectID}/tasks", createTask(store))
	mux.HandleFunc("GET /tasks/{id}", getTask(store))
	mux.HandleFunc("PATCH /tasks/{id}/status", updateTaskStatus(store))

	return mux
}

func listTasks(store Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		projectID := r.PathValue("projectID")

		tasks, err := store.List(projectID)
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

		r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
		dec := json.NewDecoder(r.Body)
		dec.DisallowUnknownFields()

		var body createTaskRequest
		if err := dec.Decode(&body); err != nil {
			writeError(w, http.StatusBadRequest, "invalid_body", "request body must be JSON with a title field")
			return
		}
		if body.Title == "" {
			writeError(w, http.StatusBadRequest, "invalid_title", "title is required")
			return
		}

		created, err := store.Create(Task{Title: body.Title, Status: "todo", ProjectID: projectID})
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal_error", "could not create task")
			return
		}

		w.Header().Set("Location", "/tasks/"+created.ID)
		writeJSON(w, http.StatusCreated, created)
	}
}

func getTask(store Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")

		task, err := store.Get(id)
		if err != nil {
			if errors.Is(err, ErrNotFound) {
				writeError(w, http.StatusNotFound, "not_found", "task not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "internal_error", "could not get task")
			return
		}
		writeJSON(w, http.StatusOK, task)
	}
}

type updateStatusRequest struct {
	Status string `json:"status"`
}

var validStatuses = map[string]bool{"todo": true, "doing": true, "done": true}

func updateTaskStatus(store Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")

		r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
		dec := json.NewDecoder(r.Body)
		dec.DisallowUnknownFields()

		var body updateStatusRequest
		if err := dec.Decode(&body); err != nil {
			writeError(w, http.StatusBadRequest, "invalid_body", "request body must be JSON with a status field")
			return
		}
		if !validStatuses[body.Status] {
			writeError(w, http.StatusUnprocessableEntity, "invalid_status", "status must be todo, doing, or done")
			return
		}

		updated, err := store.UpdateStatus(id, body.Status)
		if err != nil {
			if errors.Is(err, ErrNotFound) {
				writeError(w, http.StatusNotFound, "not_found", "task not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "internal_error", "could not update task")
			return
		}
		writeJSON(w, http.StatusOK, updated)
	}
}
