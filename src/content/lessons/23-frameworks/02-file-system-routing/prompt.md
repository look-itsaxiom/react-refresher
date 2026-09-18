No framework runtime is available in this sandbox, so instead of running Next.js, you'll
build the two pure functions that *are* its file-system router: turning a list of file
paths into route records, and matching a URL against those records. This is the same
transformation `next build` runs over your `app/` directory before it ever renders
anything.

Two functions need finishing in `App.tsx`:

## 1. `segmentToPatternPart(segment)`

Given one path segment (a folder name), classify it and return the piece that belongs in
a URL pattern:

- `(marketing)` — a **route group**. Groups organize files but never appear in the URL.
  Return `{ part: null }`.
- `[slug]` — a **dynamic segment**. Return `{ part: ':slug', paramName: 'slug' }`.
- `[...parts]` — a **catch-all segment**, matching one or more remaining URL segments.
  Return `{ part: '*parts', paramName: 'parts' }`.
- anything else — a **static segment**. Return `{ part: segment }` unchanged (no
  `paramName`).

`buildRoutes` (already wired up) calls this per segment to assemble each route's
`pattern` and `paramNames`, and separately walks the directory tree collecting any
`layout.tsx` files into `layouts`, root-to-leaf. You don't need to touch that part.

## 2. The matching loop inside `matchRoute(routes, url)`

`matchRoute` already splits `url` into segments and, for each route, checks the segment
count is compatible (accounting for a trailing catch-all, which can absorb multiple
segments) before handing you `patternSegments` and `urlSegments` for that candidate.
Finish the loop that walks both in parallel:

- A static pattern segment (`'about'`) must equal the URL segment at that position
  exactly, or this route doesn't match at all.
- A dynamic pattern segment (`':slug'`) always matches; record `urlSegments[i]` under
  `params.slug`.
- A catch-all pattern segment (`'*parts'`, always last) always matches; record every
  remaining URL segment from that position onward, as an array, under `params.parts`.

Track a `score` as you go — a static match is worth more than a dynamic match, which is
worth more than a catch-all — so that when a URL could satisfy more than one route,
`matchRoute` returns the most specific one (this project's fixture data never actually
creates that ambiguity, but the scoring is what a real router needs to be correct as
routes grow).

`buildRoutes` and `matchRoute`'s outer shape, and the default `App`, are already written.
