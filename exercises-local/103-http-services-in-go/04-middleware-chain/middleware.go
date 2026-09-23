//go:build !solution

package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"time"
)

// Chain applies mws around h so that mws[0] is outermost: it is the first
// middleware to see the request and the last to see the response.
//
// TODO: this currently applies mws in reverse -- mws[len(mws)-1] ends up
// outermost instead of mws[0]. Fix the ordering.
func Chain(h http.Handler, mws ...func(http.Handler) http.Handler) http.Handler {
	for i := 0; i < len(mws); i++ {
		h = mws[i](h)
	}
	return h
}

type contextKey int

const requestIDKey contextKey = iota

// RequestID reuses an incoming X-Request-ID header if present, otherwise
// generates one. Either way it must set the header on the response AND
// store the id in the request context so RequestIDFrom can retrieve it in
// handlers and other middleware further down the chain.
//
// TODO: this only sets the response header. It never stores the id in the
// context, so RequestIDFrom always returns "".
func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get("X-Request-ID")
		if id == "" {
			id = "todo-generate-one"
		}
		w.Header().Set("X-Request-ID", id)
		next.ServeHTTP(w, r)
	})
}

// RequestIDFrom returns the request ID stored in ctx by RequestID, or "" if
// none is present.
func RequestIDFrom(ctx context.Context) string {
	id, _ := ctx.Value(requestIDKey).(string)
	return id
}

// Recover must catch a panic in next, respond with a 500 JSON error
// envelope, and let the server keep serving other requests afterward.
//
// TODO: implement this. Right now it does nothing, so a panic in next
// propagates and takes the whole request down with it.
func Recover(next http.Handler) http.Handler {
	return next
}

// Timeout must bound the request's context to d, and respond 503 with a
// JSON error envelope if next does not finish within d.
//
// TODO: implement this. Right now it does nothing, so slow handlers are
// never cut off.
func Timeout(d time.Duration) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return next
	}
}

// Logger must write one slog record per request with fields method, path,
// status, duration_ms, and request_id.
//
// TODO: implement this. Right now it logs nothing.
func Logger(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return next
	}
}
