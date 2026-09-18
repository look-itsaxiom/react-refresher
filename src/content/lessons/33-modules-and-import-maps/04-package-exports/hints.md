First decide the shape of `pkg.exports`: a string (or `null`) is shorthand for `{ ".":
value }`. For an object, look at its keys — if every key starts with `"."` it's a subpath
map; if none do, treat the whole object as the target for `"."` directly; if it's a mix,
throw. Write that shape-detection as its own small step before touching `subpath` at all.
---
Write one recursive helper, `resolveTarget(target, conditions, starMatch)`, that takes
whatever value a subpath key mapped to and turns it into a final string (or `null`/
`undefined`). A string target returns itself (substituting `starMatch` for `*` if one was
captured). A `null` target returns `null`. An object target is a conditions object: walk
its own keys *in order*, and for the first key that's `"default"` or in the `conditions`
array, recurse into its value — if that recursion is `undefined`, keep scanning the
object's remaining keys instead of stopping.
---
For subpath matching: check for an exact key in the map first (no `*` involved at all). If
there's no exact key, scan every key containing exactly one `*`, and among the ones whose
prefix and suffix both match `subpath`, keep the one with the longest prefix — same "track
the best candidate as you go" pattern as the trailing-slash matching in the import-map
exercise.
---
`hazardCheck` is short once `resolvePackageExports` works: resolve `"."` under `["import"]`
and under `["require"]` inside a `try`, return `false` if either throws, and otherwise
return whether the two resolved strings differ.
