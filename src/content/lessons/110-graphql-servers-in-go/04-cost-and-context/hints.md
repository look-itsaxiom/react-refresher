`Cost` is a bottom-up recursion: compute each child's cost first (`childCost := sum of
Cost(sel, rules) for sel in f.Selections`), then look up the multiplier -- `f.Args[rules.ListArg]`
if present, else 1 -- and return `own + multiplier*childCost`. The multiplier only ever applies
to the children, never to the field's own cost.

---

`Depth` is also bottom-up: a field with no selections returns 1 directly (don't recurse into an
empty loop and get 0). A field with selections returns `1 + max(Depth(child) for child in
f.Selections)`.

---

For `Authenticate`, everything before the `lookup` call is already correct. The only change is
what happens after `lookup` succeeds: capture the `Principal` it returns (don't discard it with
`_`), build a new context with `WithPrincipal(r.Context(), principal)`, and pass a request built
from that context -- `r.WithContext(ctx)` -- to `next.ServeHTTP`, not the original `r`.

---

Near-solution shape for `Cost`:

```go
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
```

`Depth` and `Authenticate` are each a one-line fix once you see where the missing `+1` and the
missing `WithPrincipal`/`WithContext` calls belong.
