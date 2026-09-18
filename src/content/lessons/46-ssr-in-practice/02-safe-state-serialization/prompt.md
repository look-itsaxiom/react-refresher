# Serialize state without opening a script tag

Every SSR framework does the same trick at some point: render HTML on the
server, then drop the data that HTML was rendered from into a
`<script type="application/json">` tag so the client can hydrate against
it without refetching. `App.tsx` has a version of this that's naive in
exactly the ways that bite in production.

Implement four exports:

1. **`serializeState(value)`** — returns a string safe to place as the
   *text content* of a `<script>` tag. It must:
   - Escape every `<`, `>`, `&`, U+2028 (line separator), and U+2029
     (paragraph separator) so the string can never contain a literal
     `</script>`, `<!--`, or a raw line/paragraph separator, no matter
     what the input contains.
   - Represent `Date`, `Map`, `Set`, `undefined`, and `bigint` values
     (including nested inside plain objects/arrays) so they survive a
     round trip through `deserializeState` — plain `JSON.stringify`
     can't do any of these.
2. **`deserializeState(text)`** — the exact inverse of `serializeState`:
   given a string it produced, return a value `===`-equivalent in
   structure and type to the original (a `Date` comes back as a `Date`,
   not a string; a `Set` comes back as a `Set`; `undefined` survives).
3. **`renderWithState(Component, state)`** — uses `renderToString` to
   render `<Component state={state} />`, and returns one HTML string
   containing a container `<div id="app-root">` with that markup, followed
   by a `<script type="application/json" id="app-state">` tag whose
   content is `serializeState(state)`.
4. **`bootFromDocument(container, Component, options?)`** — reads the
   `#app-state` script tag's text out of the current `document`,
   deserializes it, and calls `hydrateRoot(container, <Component state={...} />, options)`.
   Forward `options` (including `onRecoverableError`) straight through to
   `hydrateRoot`.

The starter's `Widget` component and `buildDemoState()` show the shape of
state you're serializing: an object with a `Date`, a `Set`, and a field
that could contain arbitrary (possibly hostile) user text.

## Why this matters

`devalue` (SvelteKit, Nuxt) and `superjson` (common in tRPC/Next.js
stacks) exist because "serialize the loader's output and hydrate from
it" is universal, and "just `JSON.stringify` it" is a stored-XSS bug the
first time a user's display name contains `</script>`. You're building a
minimal version of the same two functions.
