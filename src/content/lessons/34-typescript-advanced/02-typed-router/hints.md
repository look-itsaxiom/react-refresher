Start with `ExtractParams`. You need two conditional branches, checked in order: one for
"there's a param followed by more segments" and one for "there's exactly one trailing
param." Both use `infer` to pull pieces out of the template literal.
---
The "more segments follow" branch looks like:
`Path extends \`${infer _Start}:${infer Param}/${infer Rest}\` ? ... : ...`. `_Start` is
everything before the colon (you don't need it, hence the leading underscore), `Param` is
the name up to the next `/`, and `Rest` is everything after that `/` — recurse on `Rest`
with the same type, and merge its keys with `Param` using a mapped type:
`{ [K in Param | keyof ExtractParams<Rest>]: string }`.
---
The "exactly one trailing param" branch is the same idea without a `Rest`:
`Path extends \`${infer _Start}:${infer Param}\` ? { [K in Param]: string } : Record<string, never>`.
Order matters — check for "param followed by `/`" first, since a path with more than one
param would otherwise match the single-param branch too early and drop the rest.
---
For `matchPath`'s loop, the two cases are:
`if (part.startsWith(':')) { params[part.slice(1)] = segment; } else if (part !== segment) { return null; }`.
Nothing needs to happen when a literal segment matches — just don't return early.
---
If `_paramsTwoSegments` still shows an error after fixing `ExtractParams`, print
`ExtractParams<'/users/:id/posts/:postId'>` on its own (hover over a variable typed with
it, or add a throwaway `type Debug = ExtractParams<'/users/:id/posts/:postId'>`) and check
whether it's `{ id: string; postId: string }` or something with an extra `_Start`-shaped
key — a common mistake is forgetting the leading underscore convention doesn't do anything
functionally; the bug is almost always in which branch runs first.
