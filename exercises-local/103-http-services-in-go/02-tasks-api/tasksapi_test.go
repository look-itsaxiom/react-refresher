package tasksapi

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func newTestServer() http.Handler {
	return NewServer(NewMemStore())
}

func decodeErrorEnvelope(t *testing.T, body []byte) (code, message string) {
	t.Helper()
	var envelope struct {
		Error struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		t.Fatalf("decode error envelope: %v, body: %s", err, body)
	}
	return envelope.Error.Code, envelope.Error.Message
}

func TestListTasks(t *testing.T) {
	srv := newTestServer()

	req := httptest.NewRequest(http.MethodPost, "/projects/proj-1/tasks", bytes.NewBufferString(`{"title":"Write design doc"}`))
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("seed create: got status %d, want %d, body: %s", rec.Code, http.StatusCreated, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/projects/proj-1/tasks", nil)
	rec = httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d", rec.Code, http.StatusOK)
	}
	var tasks []Task
	if err := json.Unmarshal(rec.Body.Bytes(), &tasks); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(tasks) != 1 || tasks[0].Title != "Write design doc" || tasks[0].ProjectID != "proj-1" {
		t.Fatalf("got tasks %+v, want one task for proj-1", tasks)
	}

	req = httptest.NewRequest(http.MethodGet, "/projects/proj-2/tasks", nil)
	rec = httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("empty project: got status %d, want %d", rec.Code, http.StatusOK)
	}
	var empty []Task
	if err := json.Unmarshal(rec.Body.Bytes(), &empty); err != nil {
		t.Fatalf("decode empty response: %v", err)
	}
	if len(empty) != 0 {
		t.Fatalf("got %d tasks for proj-2, want 0", len(empty))
	}
}

func TestCreateTask(t *testing.T) {
	srv := newTestServer()

	req := httptest.NewRequest(http.MethodPost, "/projects/proj-1/tasks", bytes.NewBufferString(`{"title":"Ship it"}`))
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("got status %d, want %d, body: %s", rec.Code, http.StatusCreated, rec.Body.String())
	}
	loc := rec.Header().Get("Location")
	if !bytes.HasPrefix([]byte(loc), []byte("/tasks/")) || loc == "/tasks/" {
		t.Fatalf("got Location %q, want it to start with /tasks/ and include an id", loc)
	}
	var created Task
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if created.Title != "Ship it" || created.ProjectID != "proj-1" || created.Status != "todo" || created.ID == "" {
		t.Fatalf("got task %+v, want a task with title, project, default status, and an id", created)
	}
}

func TestCreateTaskValidation(t *testing.T) {
	tests := []struct {
		name string
		body string
	}{
		{"malformed json", `{"title":`},
		{"unknown field", `{"title":"ok","bogus":true}`},
		{"empty title", `{"title":""}`},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			srv := newTestServer()
			req := httptest.NewRequest(http.MethodPost, "/projects/proj-1/tasks", bytes.NewBufferString(tt.body))
			rec := httptest.NewRecorder()
			srv.ServeHTTP(rec, req)

			if rec.Code != http.StatusBadRequest {
				t.Fatalf("got status %d, want %d, body: %s", rec.Code, http.StatusBadRequest, rec.Body.String())
			}
			code, message := decodeErrorEnvelope(t, rec.Body.Bytes())
			if code == "" || message == "" {
				t.Fatalf("got empty error code/message, body: %s", rec.Body.String())
			}
		})
	}
}

func TestGetTask(t *testing.T) {
	srv := newTestServer()

	req := httptest.NewRequest(http.MethodPost, "/projects/proj-1/tasks", bytes.NewBufferString(`{"title":"Find me"}`))
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	var created Task
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatalf("seed decode: %v", err)
	}

	req = httptest.NewRequest(http.MethodGet, "/tasks/"+created.ID, nil)
	rec = httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d", rec.Code, http.StatusOK)
	}

	req = httptest.NewRequest(http.MethodGet, "/tasks/does-not-exist", nil)
	rec = httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("got status %d, want %d", rec.Code, http.StatusNotFound)
	}
	code, _ := decodeErrorEnvelope(t, rec.Body.Bytes())
	if code == "" {
		t.Fatalf("got empty error code for 404 body: %s", rec.Body.String())
	}
}

func TestUpdateTaskStatus(t *testing.T) {
	srv := newTestServer()

	req := httptest.NewRequest(http.MethodPost, "/projects/proj-1/tasks", bytes.NewBufferString(`{"title":"Move me"}`))
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	var created Task
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatalf("seed decode: %v", err)
	}

	req = httptest.NewRequest(http.MethodPatch, "/tasks/"+created.ID+"/status", bytes.NewBufferString(`{"status":"doing"}`))
	rec = httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d, body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}
	var updated Task
	if err := json.Unmarshal(rec.Body.Bytes(), &updated); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if updated.Status != "doing" {
		t.Fatalf("got status %q, want doing", updated.Status)
	}

	req = httptest.NewRequest(http.MethodPatch, "/tasks/"+created.ID+"/status", bytes.NewBufferString(`{"status":"archived"}`))
	rec = httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("got status %d, want %d", rec.Code, http.StatusUnprocessableEntity)
	}

	req = httptest.NewRequest(http.MethodPatch, "/tasks/does-not-exist/status", bytes.NewBufferString(`{"status":"doing"}`))
	rec = httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("got status %d, want %d", rec.Code, http.StatusNotFound)
	}
}

func TestMethodNotAllowed(t *testing.T) {
	srv := newTestServer()

	req := httptest.NewRequest(http.MethodDelete, "/projects/proj-1/tasks", nil)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("got status %d, want %d", rec.Code, http.StatusMethodNotAllowed)
	}
	if rec.Header().Get("Allow") == "" {
		t.Fatal("want an Allow header on a 405 response, got none")
	}
}
