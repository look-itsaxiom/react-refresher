package lifecycle

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func newTestServer(t *testing.T, handler http.Handler, buf *bytes.Buffer) (*Server, net.Listener) {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("net.Listen: %v", err)
	}
	s := &Server{
		HTTP:            &http.Server{Handler: handler},
		Logger:          slog.New(slog.NewJSONHandler(buf, nil)),
		ShutdownTimeout: 2 * time.Second,
		Ready:           &Readiness{},
	}
	s.Ready.SetReady(true)
	return s, ln
}

func statusFor(s *Server) int {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	s.Ready.Handler().ServeHTTP(rec, req)
	return rec.Code
}

func TestRunDrainsSlowInFlightRequest(t *testing.T) {
	var buf bytes.Buffer
	started := make(chan struct{})
	mux := http.NewServeMux()
	mux.HandleFunc("/slow", func(w http.ResponseWriter, _ *http.Request) {
		close(started)
		time.Sleep(200 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("done"))
	})

	s, ln := newTestServer(t, mux, &buf)
	addr := ln.Addr().String()

	ctx, cancel := context.WithCancel(context.Background())
	runErr := make(chan error, 1)
	go func() { runErr <- Run(ctx, s, ln) }()

	respErr := make(chan error, 1)
	status := 0
	go func() {
		resp, err := http.Get("http://" + addr + "/slow")
		if err != nil {
			respErr <- err
			return
		}
		status = resp.StatusCode
		resp.Body.Close()
		respErr <- nil
	}()

	select {
	case <-started:
	case <-time.After(2 * time.Second):
		t.Fatal("handler never started")
	}

	// Run must still be blocked on ctx, not returned early, while a request is live.
	select {
	case err := <-runErr:
		t.Fatalf("Run returned early (err=%v) before ctx was cancelled", err)
	case <-time.After(20 * time.Millisecond):
	}

	cancel() // begin shutdown while the slow request is in flight

	if err := <-respErr; err != nil {
		t.Fatalf("GET /slow failed during drain: %v", err)
	}
	if status != http.StatusOK {
		t.Fatalf("status = %d, want %d", status, http.StatusOK)
	}

	select {
	case err := <-runErr:
		if err != nil {
			t.Fatalf("Run returned error: %v", err)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("Run did not return after shutdown completed")
	}
}

func TestReadinessFlipsDuringShutdown(t *testing.T) {
	var buf bytes.Buffer
	started := make(chan struct{})
	mux := http.NewServeMux()
	mux.HandleFunc("/slow", func(w http.ResponseWriter, _ *http.Request) {
		close(started)
		time.Sleep(150 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	})

	s, ln := newTestServer(t, mux, &buf)
	addr := ln.Addr().String()

	ctx, cancel := context.WithCancel(context.Background())
	runErr := make(chan error, 1)
	go func() { runErr <- Run(ctx, s, ln) }()

	go func() {
		resp, err := http.Get("http://" + addr + "/slow")
		if err == nil {
			resp.Body.Close()
		}
	}()

	select {
	case <-started:
	case <-time.After(2 * time.Second):
		t.Fatal("handler never started")
	}

	if got := statusFor(s); got != http.StatusOK {
		t.Fatalf("readiness before shutdown = %d, want %d", got, http.StatusOK)
	}

	cancel()

	deadline := time.Now().Add(1 * time.Second)
	got := statusFor(s)
	for got != http.StatusServiceUnavailable && time.Now().Before(deadline) {
		time.Sleep(5 * time.Millisecond)
		got = statusFor(s)
	}
	if got != http.StatusServiceUnavailable {
		t.Fatalf("readiness during shutdown = %d, want %d", got, http.StatusServiceUnavailable)
	}

	select {
	case <-runErr:
	case <-time.After(3 * time.Second):
		t.Fatal("Run did not return after shutdown completed")
	}
}

func TestRunLogsStartingAndStoppedWithAttrs(t *testing.T) {
	var buf bytes.Buffer
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	s, ln := newTestServer(t, mux, &buf)

	ctx, cancel := context.WithCancel(context.Background())
	runErr := make(chan error, 1)
	go func() { runErr <- Run(ctx, s, ln) }()

	time.Sleep(20 * time.Millisecond) // let the "starting" record land
	cancel()

	select {
	case err := <-runErr:
		if err != nil {
			t.Fatalf("Run returned error: %v", err)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("Run did not return after shutdown completed")
	}

	lines := strings.Split(strings.TrimSpace(buf.String()), "\n")
	var sawStarting, sawStopped bool
	for _, line := range lines {
		if line == "" {
			continue
		}
		var rec map[string]any
		if err := json.Unmarshal([]byte(line), &rec); err != nil {
			t.Fatalf("log line is not valid JSON: %q: %v", line, err)
		}
		msg, _ := rec["msg"].(string)
		switch msg {
		case "starting":
			sawStarting = true
			if _, ok := rec["addr"]; !ok {
				t.Fatal(`"starting" log is missing the "addr" attribute`)
			}
		case "stopped":
			sawStopped = true
			if _, ok := rec["addr"]; !ok {
				t.Fatal(`"stopped" log is missing the "addr" attribute`)
			}
			if _, ok := rec["duration_ms"]; !ok {
				t.Fatal(`"stopped" log is missing the "duration_ms" attribute`)
			}
		}
	}
	if !sawStarting {
		t.Fatal(`no "starting" log record`)
	}
	if !sawStopped {
		t.Fatal(`no "stopped" log record`)
	}
}

func TestRunNeverReturnsErrServerClosed(t *testing.T) {
	var buf bytes.Buffer
	s, ln := newTestServer(t, http.NewServeMux(), &buf)

	ctx, cancel := context.WithCancel(context.Background())
	runErr := make(chan error, 1)
	go func() { runErr <- Run(ctx, s, ln) }()

	time.Sleep(20 * time.Millisecond)
	cancel()

	select {
	case err := <-runErr:
		if errors.Is(err, http.ErrServerClosed) {
			t.Fatalf("Run returned http.ErrServerClosed, want nil or a real error")
		}
	case <-time.After(3 * time.Second):
		t.Fatal("Run did not return after shutdown completed")
	}
}
