`validateIdToken`: build `errors: string[] = []` and push a message for
each failing check, the same shape as lesson 71's `validateClaims`. For
`aud`, normalize first: `const audList = Array.isArray(claims.aud) ?
claims.aud : claims.aud !== undefined ? [claims.aud] : []`, then
`audList.includes(options.clientId)` covers both the string and array
cases in one check. The `azp` rule only becomes *required* (not just
checked-if-present) when `audList.length > 1`.

---

For the `exp`/leeway check, guard with `typeof claims.exp !== 'number'`
before comparing, so a token with no `exp` at all fails with a clear
"missing exp" rather than doing arithmetic on `undefined`. Same pattern for
`auth_time` when `options.maxAgeSeconds` is set.

---

`redirectUriAllowed`: check the exact-match case first and return early.
Then reject anything containing `*` before doing any URL parsing. For the
loopback case, parse both with `new URL(...)` inside a `try`/`catch`
(returning `false` on a parse failure), write an `isLoopbackHost(host)`
helper checking against `'127.0.0.1'`, `'::1'`, and `'localhost'`, and
compare every field of the two URLs *except* `port`: protocol, hostname,
pathname, and search must all match, and `hostname` must additionally pass
`isLoopbackHost`.
