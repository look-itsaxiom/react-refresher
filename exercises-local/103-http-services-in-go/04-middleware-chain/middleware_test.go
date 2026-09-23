package middleware

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func appendLabel(label string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Add("X-Order", label)
			next.ServeHTTP(w, r)
		})
	}
}

func TestChainOrdering(t *testing.T) {
	final := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	h := Chain(final, appendLabel("a"), appendLabel("b"), appendLabel("c"))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	got := rec.Header().Values("X-Order")
	want := []string{"a", "b", "c"}
	if len(got) != len(want) {
		t.Fatalf("got headers %v, want %v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("got order %v, want %v (mws[0] must run first, i.e. be outermost)", got, want)
		}
	}
}

func TestRequestIDPropagation(t *testing.T) {
	var gotFromCtx string
	final := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotFromCtx = RequestIDFrom(r.Context())
		w.WriteHeader(http.StatusOK)
	})
	h := RequestID(final)

	t.Run("generates when absent", func(t *testing.T) {
		gotFromCtx = ""
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)

		headerID := rec.Header().Get("X-Request-ID")
		if headerID == "" {
			t.Fatal("want a generated X-Request-ID response header, got none")
		}
		if gotFromCtx != headerID {
			t.Fatalf("got request id in context %q, want it to match the response header %q", gotFromCtx, headerID)
		}
	})

	t.Run("reuses an incoming id", func(t *testing.T) {
		gotFromCtx = ""
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.Header.Set("X-Request-ID", "client-supplied-id")
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)

		if got := rec.Header().Get("X-Request-ID"); got != "client-supplied-id" {
			t.Fatalf("got X-Request-ID %q, want it to reuse the incoming value", got)
		}
		if gotFromCtx != "client-supplied-id" {
			t.Fatalf("got request id in context %q, want client-supplied-id", gotFromCtx)
		}
	})
}

func TestTimeoutMiddleware(t *testing.T) {
	slow := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		select {
		case <-time.After(300 * time.Millisecond):
			w.WriteHeader(http.StatusOK)
		case <-r.Context().Done():
		}
	})
	h := Timeout(30 * time.Millisecond)(slow)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("got status %d, want %d", rec.Code, http.StatusServiceUnavailable)
	}
	var envelope struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode error envelope: %v, body: %s", err, rec.Body.String())
	}
	if envelope.Error.Code == "" {
		t.Fatalf("got empty error code, body: %s", rec.Body.String())
	}

	fast := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	h2 := Timeout(300 * time.Millisecond)(fast)
	req2 := httptest.NewRequest(http.MethodGet, "/", nil)
	rec2 := httptest.NewRecorder()
	h2.ServeHTTP(rec2, req2)
	if rec2.Code != http.StatusOK {
		t.Fatalf("got status %d for a handler that finishes in time, want %d", rec2.Code, http.StatusOK)
	}
}

func TestLoggerFields(t *testing.T) {
	var buf bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&buf, nil))

	final := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTeapot)
	})
	h := Chain(final, RequestID, Logger(logger))

	req := httptest.NewRequest(http.MethodGet, "/tasks/42", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	var fields map[string]any
	if err := json.Unmarshal(buf.Bytes(), &fields); err != nil {
		t.Fatalf("decode log line: %v, raw: %s", err, buf.String())
	}
	if fields["method"] != http.MethodGet {
		t.Fatalf("got method %v, want %v", fields["method"], http.MethodGet)
	}
	if fields["path"] != "/tasks/42" {
		t.Fatalf("got path %v, want /tasks/42", fields["path"])
	}
	status, ok := fields["status"].(float64)
	if !ok || int(status) != http.StatusTeapot {
		t.Fatalf("got status %v, want %d", fields["status"], http.StatusTeapot)
	}
	if _, ok := fields["duration_ms"]; !ok {
		t.Fatalf("log line missing duration_ms field, got: %v", fields)
	}
	if id, ok := fields["request_id"].(string); !ok || id == "" {
		t.Fatalf("log line missing a non-empty request_id, got: %v", fields)
	}
}

func TestRecoverFromPanic(t *testing.T) {
	panicky := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic("boom")
	})
	h := Recover(panicky)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("got status %d, want %d", rec.Code, http.StatusInternalServerError)
	}
	var envelope struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode error envelope: %v, body: %s", err, rec.Body.String())
	}
	if envelope.Error.Code == "" {
		t.Fatalf("got empty error code, body: %s", rec.Body.String())
	}

	ok := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	h2 := Recover(ok)
	req2 := httptest.NewRequest(http.MethodGet, "/", nil)
	rec2 := httptest.NewRecorder()
	h2.ServeHTTP(rec2, req2)
	if rec2.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d for a follow-up request after a recovered panic", rec2.Code, http.StatusOK)
	}
}
