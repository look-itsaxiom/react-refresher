//go:build solution

package lifecycle

import (
	"context"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"sync"
	"time"
)

// Readiness backs a readiness probe: not ready before the server has started, and
// flipped back to not ready as soon as shutdown begins.
type Readiness struct {
	mu    sync.RWMutex
	ready bool
}

func (r *Readiness) SetReady(ready bool) {
	r.mu.Lock()
	r.ready = ready
	r.mu.Unlock()
}

func (r *Readiness) Handler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		r.mu.RLock()
		ready := r.ready
		r.mu.RUnlock()

		w.Header().Set("Content-Type", "application/json")
		if !ready {
			w.WriteHeader(http.StatusServiceUnavailable)
			w.Write([]byte(`{"ready":false}`))
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"ready":true}`))
	})
}

// Server bundles the pieces Run needs: the http.Server to drive, a logger for
// lifecycle records, how long a shutdown is allowed to drain in-flight requests for,
// and (optionally) a readiness probe to flip when shutdown starts.
type Server struct {
	HTTP            *http.Server
	Logger          *slog.Logger
	ShutdownTimeout time.Duration
	Ready           *Readiness
}

// Run serves on ln until ctx is cancelled, then drains in-flight requests and shuts
// down. It returns nil on a clean shutdown, the shutdown error otherwise, and never
// surfaces http.ErrServerClosed -- that's Serve's signal that Shutdown was called, not
// a failure of its own.
func Run(ctx context.Context, s *Server, ln net.Listener) error {
	start := time.Now()
	addr := ln.Addr().String()
	s.Logger.Info("starting", "addr", addr)

	serveErr := make(chan error, 1)
	go func() {
		serveErr <- s.HTTP.Serve(ln)
	}()

	select {
	case err := <-serveErr:
		// The server stopped on its own (e.g. the listener was closed elsewhere)
		// before shutdown was ever requested.
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			return err
		}
		return nil
	case <-ctx.Done():
	}

	if s.Ready != nil {
		s.Ready.SetReady(false)
	}

	timeout := s.ShutdownTimeout
	if timeout <= 0 {
		timeout = 10 * time.Second
	}
	shutdownCtx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	shutdownErr := s.HTTP.Shutdown(shutdownCtx)
	<-serveErr // Serve always returns once Shutdown unblocks it; don't leak that goroutine.

	s.Logger.Info("stopped", "addr", addr, "duration_ms", time.Since(start).Milliseconds())

	if shutdownErr != nil && !errors.Is(shutdownErr, http.ErrServerClosed) {
		return shutdownErr
	}
	return nil
}
