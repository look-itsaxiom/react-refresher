package takehome

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func newTestServer() (*MemStore, http.Handler) {
	store := NewMemStore()
	return store, NewServer(store)
}

func doRequest(t *testing.T, srv http.Handler, method, path string, body any) *httptest.ResponseRecorder {
	t.Helper()
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			t.Fatalf("encode body: %v", err)
		}
	}
	req := httptest.NewRequest(method, path, &buf)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	return rec
}

func createTaskHTTP(t *testing.T, srv http.Handler, projectID, title string) Task {
	t.Helper()
	rec := doRequest(t, srv, http.MethodPost, "/projects/"+projectID+"/tasks", map[string]string{"title": title})
	if rec.Code != http.StatusCreated {
		t.Fatalf("create task: got status %d, want %d, body: %s", rec.Code, http.StatusCreated, rec.Body.String())
	}
	var created Task
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatalf("decode created task: %v", err)
	}
	return created
}

func decodeErrorCode(t *testing.T, body []byte) string {
	t.Helper()
	var envelope struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		t.Fatalf("decode error envelope: %v, body: %s", err, body)
	}
	return envelope.Error.Code
}

func TestListAndCreateTasks(t *testing.T) {
	_, srv := newTestServer()

	a := createTaskHTTP(t, srv, "proj-1", "Write design doc")
	if a.Status != "todo" || a.ProjectID != "proj-1" || a.ID == "" {
		t.Fatalf("got task %+v, want default status todo, project set, id assigned", a)
	}

	rec := doRequest(t, srv, http.MethodGet, "/projects/proj-1/tasks", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d", rec.Code, http.StatusOK)
	}
	var tasks []Task
	if err := json.Unmarshal(rec.Body.Bytes(), &tasks); err != nil {
		t.Fatalf("decode list: %v", err)
	}
	if len(tasks) != 1 || tasks[0].ID != a.ID {
		t.Fatalf("got tasks %+v, want exactly the one created task", tasks)
	}

	rec = doRequest(t, srv, http.MethodGet, "/projects/proj-2/tasks", nil)
	var empty []Task
	if err := json.Unmarshal(rec.Body.Bytes(), &empty); err != nil {
		t.Fatalf("decode empty list: %v", err)
	}
	if len(empty) != 0 {
		t.Fatalf("got %d tasks for an empty project, want 0", len(empty))
	}
}

func TestAddDependencySuccess(t *testing.T) {
	_, srv := newTestServer()

	a := createTaskHTTP(t, srv, "proj-1", "Design")
	b := createTaskHTTP(t, srv, "proj-1", "Build")

	rec := doRequest(t, srv, http.MethodPost, "/tasks/"+b.ID+"/dependencies", map[string]string{"predecessorId": a.ID})
	if rec.Code != http.StatusNoContent {
		t.Fatalf("got status %d, want %d, body: %s", rec.Code, http.StatusNoContent, rec.Body.String())
	}

	rec = doRequest(t, srv, http.MethodGet, "/projects/proj-1/ready", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d", rec.Code, http.StatusOK)
	}
	var ready []Task
	if err := json.Unmarshal(rec.Body.Bytes(), &ready); err != nil {
		t.Fatalf("decode ready: %v", err)
	}
	if len(ready) != 1 || ready[0].ID != a.ID {
		t.Fatalf("got ready %+v, want only the task with no unfinished predecessor", ready)
	}
}

func TestAddDependencyRejectsCycle(t *testing.T) {
	_, srv := newTestServer()

	a := createTaskHTTP(t, srv, "proj-1", "A")
	b := createTaskHTTP(t, srv, "proj-1", "B")
	c := createTaskHTTP(t, srv, "proj-1", "C")

	for _, dep := range []struct{ pred, succ Task }{{a, b}, {b, c}} {
		rec := doRequest(t, srv, http.MethodPost, "/tasks/"+dep.succ.ID+"/dependencies", map[string]string{"predecessorId": dep.pred.ID})
		if rec.Code != http.StatusNoContent {
			t.Fatalf("seed dependency %s->%s: got status %d, body: %s", dep.pred.ID, dep.succ.ID, rec.Code, rec.Body.String())
		}
	}

	// C already depends (transitively, through B) on A, so making A depend
	// on C would close a cycle.
	rec := doRequest(t, srv, http.MethodPost, "/tasks/"+a.ID+"/dependencies", map[string]string{"predecessorId": c.ID})
	if rec.Code != http.StatusConflict {
		t.Fatalf("got status %d, want %d, body: %s", rec.Code, http.StatusConflict, rec.Body.String())
	}
	if code := decodeErrorCode(t, rec.Body.Bytes()); code != "cycle" {
		t.Fatalf("got error code %q, want %q", code, "cycle")
	}
}

func TestAddDependencyUnknownTask(t *testing.T) {
	_, srv := newTestServer()

	a := createTaskHTTP(t, srv, "proj-1", "A")

	rec := doRequest(t, srv, http.MethodPost, "/tasks/"+a.ID+"/dependencies", map[string]string{"predecessorId": "does-not-exist"})
	if rec.Code != http.StatusNotFound {
		t.Fatalf("got status %d, want %d, body: %s", rec.Code, http.StatusNotFound, rec.Body.String())
	}
}

func TestReadyTasks(t *testing.T) {
	store, srv := newTestServer()

	a := createTaskHTTP(t, srv, "proj-1", "A")
	b := createTaskHTTP(t, srv, "proj-1", "B")

	rec := doRequest(t, srv, http.MethodPost, "/tasks/"+b.ID+"/dependencies", map[string]string{"predecessorId": a.ID})
	if rec.Code != http.StatusNoContent {
		t.Fatalf("seed dependency: got status %d, body: %s", rec.Code, rec.Body.String())
	}

	rec = doRequest(t, srv, http.MethodGet, "/projects/proj-1/ready", nil)
	var ready []Task
	if err := json.Unmarshal(rec.Body.Bytes(), &ready); err != nil {
		t.Fatalf("decode ready: %v", err)
	}
	if len(ready) != 1 || ready[0].ID != a.ID {
		t.Fatalf("got ready %+v before A is done, want only A", ready)
	}

	// This API has no status-update route (out of scope for the exercise --
	// a real submission would add one), so mark A done directly through the
	// store to set up the fixture.
	done := a
	done.Status = "done"
	store.mu.Lock()
	store.tasks[a.ID] = done
	store.mu.Unlock()

	rec = doRequest(t, srv, http.MethodGet, "/projects/proj-1/ready", nil)
	if err := json.Unmarshal(rec.Body.Bytes(), &ready); err != nil {
		t.Fatalf("decode ready after done: %v", err)
	}
	if len(ready) != 1 || ready[0].ID != b.ID {
		t.Fatalf("got ready %+v after A is done, want only B", ready)
	}
}
