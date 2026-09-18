Start with the bypass check: a specifier is treated as a URL, not a bare specifier, if it
starts with `/`, `./`, or `../`, or if `new URL(specifier)` succeeds on its own (no base
needed) — that catches `https://...`, `data:...`, and similar. For anything URL-like,
skip the import map entirely and return `new URL(specifier, referrerUrl).toString()`.
---
Write one small helper that looks up a specifier inside a *single* map (an object of
`string -> string | null`): check for an exact key first, then scan for the longest key
that ends in `/` and is a prefix of the specifier, and if found return the mapped value
with the rest of the specifier appended. Have it return `undefined` when nothing matches
at all, so the caller can tell "no match" apart from "matched but blocked."
---
For scopes, don't just check `Object.keys(importMap.scopes ?? {})` in whatever order
`Object.keys` gives you — track the *longest* scope key seen so far where
`referrerUrl.startsWith(scopeKey)` is true, the same way you'd track the longest prefix
match inside a map. Only one scope should ever be consulted; if it exists but doesn't
resolve the specifier, go straight to the top-level `imports` map next, not to another
scope.
---
Keep `null` and `undefined` distinct all the way through: your map-lookup helper returns
`null` for "found, but blocked" and `undefined` for "not found here, keep looking." The
top-level function should throw a blocked-specific error message on `null` and only fall
through to the next map (or the final "unmapped" error) on `undefined`.
