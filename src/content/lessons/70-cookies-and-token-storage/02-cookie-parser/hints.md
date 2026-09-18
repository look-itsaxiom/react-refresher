Start with `parseSetCookie`. Split on `;`, `.map(s => s.trim())`, and drop empty
segments. The first segment gives you `name`/`value` by splitting at the first `=` with
`indexOf('=')` (not `split('=')`, which would break on a value containing `=`). Loop the
rest, lowercase each attribute's key before comparing, and use a `switch` so each case is
one field assignment.

---

For the value-bearing attributes, normalize before storing: `Domain` should be
lowercased with a leading `.` stripped (`val.replace(/^\./, '').toLowerCase()`);
`SameSite` and `Priority` should map a lowercased comparison onto the exact literal
(`'Strict' | 'Lax' | 'None'` / `'Low' | 'Medium' | 'High'`) rather than just re-casing
whatever came in — a header could send `SAMESITE=STRICT` and you still want `'Strict'`
out. `Max-Age` should go through `Number(val)` and only be stored if
`!Number.isNaN(n)`.

---

Compute `expiryBasis` last, after the loop, as a simple three-way check:
`maxAge !== null ? 'max-age' : expires !== null ? 'expires' : 'session'`. This is the one
field that's *derived*, not a literal copy of an attribute — don't try to compute it
inline while parsing each attribute.

---

For `serializeCookie`, build an array of parts starting with `` `${name}=${value}` ``,
then push each present attribute onto it in the order the prompt lists, and
`.join('; ')`. Every attribute push is one `if` — no attribute needs special-casing
beyond checking whether it's `null`/`false`.

---

For `validateCookie`, treat the seven rules as independent `if` statements that each
push into a `violations: string[]` array — none of them return early, and several can
fire on the same cookie at once (e.g. a `__Host-` cookie that's also not `Secure` violates
both rule 1's `Secure` check and, if it also isn't https, rule 5). For rule 7, parse
`opts.requestUrl` with `new URL(...)`, lowercase `url.hostname`, and check
`host === domain || host.endsWith('.' + domain)`.
