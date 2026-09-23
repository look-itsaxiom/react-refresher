//go:build !solution

package lifecycle

import (
	"context"
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

// TODO: Run should serve on ln, block until ctx is cancelled, then gracefully shut
// down: flip s.Ready to not-ready, call s.HTTP.Shutdown with a context bounded by
// s.ShutdownTimeout (draining in-flight requests), and log "starting" and "stopped"
// records (with "addr", and "duration_ms" on "stopped") through s.Logger. It must
// never return http.ErrServerClosed -- that's Serve's normal "I was told to stop"
// signal, not a real failure.
func Run(ctx context.Context, s *Server, ln net.Listener) error {
	s.Logger.Info("starting", "addr", ln.Addr().String())
	go s.HTTP.Serve(ln)
	return nil
}
