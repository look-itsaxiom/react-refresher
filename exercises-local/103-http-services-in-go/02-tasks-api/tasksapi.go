//go:build !solution

package tasksapi

import "net/http"

// NewServer wires the task routes onto a fresh mux backed by store.
//
// TODO: replace notImplemented with real handlers for each route:
//   - GET    /projects/{projectID}/tasks        -> 200 + JSON list
//   - POST   /projects/{projectID}/tasks        -> 201 + Location, or 400 on bad input
//   - GET    /tasks/{id}                        -> 200, or 404 envelope
//   - PATCH  /tasks/{id}/status                 -> 200, or 422 envelope
//
// The routes are already registered below, so 404/405 behavior from the mux
// itself works even before you touch the handlers.
func NewServer(store Store) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /projects/{projectID}/tasks", notImplemented)
	mux.HandleFunc("POST /projects/{projectID}/tasks", notImplemented)
	mux.HandleFunc("GET /tasks/{id}", notImplemented)
	mux.HandleFunc("PATCH /tasks/{id}/status", notImplemented)

	return mux
}

func notImplemented(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotImplemented)
}
