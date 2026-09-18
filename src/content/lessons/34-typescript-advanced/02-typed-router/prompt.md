Two things are missing in this typed router: one type, one runtime loop.

## 1. `ExtractParams<Path>`

The stub `type ExtractParams<Path extends string> = Record<string, string>` compiles but
throws away the whole point — it doesn't know which param names actually exist on a given
path. Replace it with a recursive template-literal type that reads a path like
`'/users/:id/posts/:postId'` and produces `{ id: string; postId: string }`:

- If `Path` contains `:param/` followed by more path, capture `param` and recurse on the
  rest, merging keys.
- Otherwise, if `Path` ends in a single `:param`, capture just that one.
- Otherwise there are no params: fall back to `Record<string, never>` (an object with no
  keys).

Everything downstream — `route()`, `MatchResult`, the `Expect<Equal<...>>` lines near the
bottom of the file — is already wired to this type. Once `ExtractParams` is correct, they
type-check on their own.

## 2. `matchPath`'s capture loop

`matchPath` currently walks both the pattern and the URL segment-by-segment but never
actually compares or captures anything, so every route silently "matches" with an empty
`params` object. Inside the loop, for each `part`/`segment` pair:

- If `part` starts with `:`, the rest of `part` (after the colon) is the param name —
  store `segment` under that name in `params`.
- Otherwise `part` must equal `segment` exactly, or this path isn't a match at all: return
  `null` immediately.

## Why the casts are there

`createRouter`'s `match` function returns `{ path: r.path, params } as MatchResult<Routes>`.
The cast is intentional: `matchPath` computes params at runtime as a plain
`Record<string, string>`, and nothing about *running* the loop lets the type checker know
which specific route matched — that's information only available once you check `r.path`
against the union at the call site (see the `if (userMatch.path === '/users/:id')` block
near the bottom). The cast is where you assert "trust me, I checked" once, so every caller
downstream gets the narrowed, path-specific type for free.

## Type-level tests

Near the bottom of the file, `type _paramsOneSegment = Expect<Equal<...>>` lines and a
`// @ts-expect-error` are your type-level tests. The sandbox preview strips all types
before running your code, so it can't grade these — they only fail or pass under a real
type-checker, the same way `pnpm typecheck` grades every `solution.tsx` in this repo. Watch
the "Problems" panel (or run a type check) as you edit; a red squiggle on `_paramsOneSegment`
means `ExtractParams` isn't right yet.
