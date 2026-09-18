Start with the two "never sent" gates before anything else: a `SameSite=None` cookie
without `Secure` is invalid (return `false` immediately), and a `Secure` cookie only
rides along on requests whose *target* URL is `https`. Get those two `if` checks in
place first and the rest of the function only needs to run when both have passed.

---

Use `siteOf(request.initiatorUrl)` and `siteOf(request.targetUrl)` and compare both the
`scheme` and the `site` fields. If they match on both, it's a same-site request and the
cookie is sent (given the gates above already passed) — you don't need to look at
`sameSite` at all for that case, same-site requests always carry the cookie.

---

For the cross-site branch, a `switch (cookie.sameSite)` over `'Strict' | 'None' | 'Lax'`
maps cleanly to three return values. `'Strict'` is `false`. `'None'` is `true`. `'Lax'`
needs its own two-line check: bail to `false` if `!request.topLevelNavigation`, then
`return true` for `'GET'`, and for anything else return whether
`request.ageOfCookieSeconds <= 120` — but only when the method is `'POST'`; any other
method with `topLevelNavigation: true` should still be `false`.

---

For `csrfRisk`, write it as a sequence of early returns in exactly the order listed in
the prompt — don't try to build one big boolean expression. Each `if` block returns a
complete `CsrfVerdict` object and the function is done. The only branch that produces
more than one reason string is the `checksOrigin || checksFetchMetadata` step: build the
`reasons` array with two separate `if` pushes rather than picking one string.

---

The trickiest part of `csrfRisk` is remembering that `sameSite === 'Strict'` protects
*even when `sideEffects` is true* — it has to be checked before the `!sideEffects` early
return, and both have to be checked before you ever look at `'None'` vs `'Lax'`, because
by the time you reach that last switch, you already know the endpoint has side effects,
uses cookie auth, isn't `Strict`, and has no token/origin check — so it must be exposed;
the only question left is which reason string to attach, and that's decided by
`sameSite` and `method`.
