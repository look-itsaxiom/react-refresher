package graphcost

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
)

// Principal is what Authenticate puts on the request context after a
// successful lookup -- the request-scoped value a resolver reads to decide
// what it's allowed to return.
type Principal struct {
	UserID string
	OrgID  string
	Roles  []string
}

type contextKey int

const principalKey contextKey = iota

func WithPrincipal(ctx context.Context, p Principal) context.Context {
	return context.WithValue(ctx, principalKey, p)
}

func PrincipalFrom(ctx context.Context) (Principal, bool) {
	p, ok := ctx.Value(principalKey).(Principal)
	return p, ok
}

var (
	ErrUnauthorized = errors.New("graphcost: no principal on context")
	ErrForbidden    = errors.New("graphcost: principal lacks required role")
)

// RequireRole returns ErrUnauthorized when ctx carries no principal at all,
// ErrForbidden when it does but lacks role, and nil when the principal has
// it.
func RequireRole(ctx context.Context, role string) error {
	p, ok := PrincipalFrom(ctx)
	if !ok {
		return ErrUnauthorized
	}
	for _, r := range p.Roles {
		if r == role {
			return nil
		}
	}
	return ErrForbidden
}

func writeUnauthorized(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"error": map[string]string{"code": "unauthorized", "message": "missing or invalid token"},
	})
}
