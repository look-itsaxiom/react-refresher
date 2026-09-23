//go:build !solution

package graphcost

import (
	"net/http"
	"strings"
)

// Cost estimates the cost of resolving f and everything under it. A field's
// own cost comes from rules.PerField[f.Name] (falling back to
// rules.Default), and a field that takes a rules.ListArg argument (e.g.
// `first`) represents a list -- resolving N items each pays for the whole
// subtree under it, so the children's cost is multiplied by N.
//
// TODO: this starter adds every field's cost together flat -- it never
// multiplies a field's children by its list argument, so a query that asks
// for `first: 1000` items costs the same as one asking for `first: 1`. Fix
// Cost so a field with rules.ListArg present multiplies its *children's*
// combined cost by that argument's value before adding its own cost.
func Cost(f Field, rules CostRules) int {
	own := rules.PerField[f.Name]
	if own == 0 {
		own = rules.Default
	}
	total := own
	for _, sel := range f.Selections {
		total += Cost(sel, rules)
	}
	return total
}

// Depth returns how many field levels deep f's selection tree goes. A field
// with no selections is 1 level deep.
//
// TODO: this starter is off by one at every level -- a leaf field (no
// selections) returns 0 instead of 1. Fix Depth so a leaf counts as depth 1
// and each level of nesting adds exactly 1.
func Depth(f Field) int {
	if len(f.Selections) == 0 {
		return 0
	}
	max := 0
	for _, sel := range f.Selections {
		if d := Depth(sel); d > max {
			max = d
		}
	}
	return max + 1
}

// Authenticate builds middleware that reads `Authorization: Bearer <token>`,
// resolves it to a Principal with lookup, and rejects the request with a
// 401 JSON body when the token is missing or lookup doesn't recognize it.
//
// TODO: this starter correctly rejects a missing or unrecognized token, but
// on success it never attaches the resolved Principal to the request
// context -- a handler downstream of this middleware has no way to read who
// the caller is. Fix Authenticate so a valid token's Principal is reachable
// from the wrapped handler via PrincipalFrom(r.Context()).
func Authenticate(lookup func(token string) (Principal, bool)) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			auth := r.Header.Get("Authorization")
			token, ok := strings.CutPrefix(auth, "Bearer ")
			if !ok || token == "" {
				writeUnauthorized(w)
				return
			}

			_, ok = lookup(token)
			if !ok {
				writeUnauthorized(w)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
