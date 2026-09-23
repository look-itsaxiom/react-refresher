# Fix the cost limiter and the auth middleware

`ParseSelection`, `Enforce`, `WithPrincipal`/`PrincipalFrom`, and `RequireRole` already work --
you don't touch them. Three functions have bugs; fix `Cost`, `Depth`, and `Authenticate`.

## `Cost`: multipliers are missing

```go
func Cost(f Field, rules CostRules) int
```

A field's own cost is `rules.PerField[f.Name]`, falling back to `rules.Default` when the field
isn't listed. A field carrying `rules.ListArg` (conventionally `"first"`) represents a list:
resolving N items pays for N copies of everything under it, so that field's **children's**
combined cost should be multiplied by N before adding the field's own cost. The starter just
adds every field's cost flat, so `first: 1` and `first: 1000` cost the same. Fix `Cost` so the
worked example

```
projects(first: 10) { tasks(first: 20) { assignee { name } } }
```

costs **411** under `CostRules{Default: 1, ListArg: "first"}` -- work it out bottom-up: `name`
costs 1, `assignee` costs `1 + 1*1 = 2`, `tasks` costs `1 + 20*2 = 41`, `projects` costs
`1 + 10*41 = 411`.

## `Depth`: off by one

```go
func Depth(f Field) int
```

A field with no selections is 1 level deep, and each level of nesting adds exactly 1. The
starter returns depth 0 for a leaf field instead of 1 -- every result is short by one level.
Fix it so the worked example above reports depth 4.

## `Authenticate`: the principal never reaches the handler

```go
func Authenticate(lookup func(token string) (Principal, bool)) func(http.Handler) http.Handler
```

The starter already rejects a missing or unrecognized `Authorization: Bearer <token>` with a
401. On success, though, it calls `next.ServeHTTP(w, r)` with the **original** request --
nothing attaches the resolved `Principal` to context, so a handler downstream has no way to
read who the caller is. Fix it so `PrincipalFrom(r.Context())` inside the wrapped handler
returns the looked-up principal.

Run `go test ./...` inside this exercise's folder to check your work.
