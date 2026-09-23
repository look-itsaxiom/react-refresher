//go:build solution

package graphcost

import (
	"net/http"
	"strings"
)

func Cost(f Field, rules CostRules) int {
	own := rules.PerField[f.Name]
	if own == 0 {
		own = rules.Default
	}

	childCost := 0
	for _, sel := range f.Selections {
		childCost += Cost(sel, rules)
	}

	multiplier := 1
	if v, ok := f.Args[rules.ListArg]; ok {
		multiplier = v
	}

	return own + multiplier*childCost
}

func Depth(f Field) int {
	max := 0
	for _, sel := range f.Selections {
		if d := Depth(sel); d > max {
			max = d
		}
	}
	return max + 1
}

func Authenticate(lookup func(token string) (Principal, bool)) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			auth := r.Header.Get("Authorization")
			token, ok := strings.CutPrefix(auth, "Bearer ")
			if !ok || token == "" {
				writeUnauthorized(w)
				return
			}

			principal, ok := lookup(token)
			if !ok {
				writeUnauthorized(w)
				return
			}

			ctx := WithPrincipal(r.Context(), principal)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
