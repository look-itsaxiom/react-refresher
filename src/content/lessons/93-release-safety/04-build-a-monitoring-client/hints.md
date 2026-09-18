Write `scrub` as a recursive walk over `extra`. At each object, check every key against
`/^(password|token|secret|authorization)$/i` *before* recursing into that key's value —
if it matches, replace the whole value with `'[redacted]'` and don't descend into it (a
matched key's value might itself be an object; you still don't want to recurse, you want
to nuke it). For string values you don't redact by key, run two `.replace()` calls: one
for an email pattern, one for `Bearer <token>`.

---

An email regex like `/[^\s@]+@[^\s@]+\.[^\s@]+/g` is good enough here — you're not
validating emails, just finding ones to redact. For the bearer pattern, `/Bearer\s+\S+/gi`
matches "Bearer" plus whatever non-whitespace token follows it; replace the whole match
with `'Bearer [redacted]'`.

---

The breadcrumb ring buffer: after pushing, if `breadcrumbs.length > maxBreadcrumbs`, trim
from the front (`.slice(breadcrumbs.length - maxBreadcrumbs)` or repeated `.shift()`) so
only the most recent `maxBreadcrumbs` remain, oldest-first.

---

Dedupe and sampling are two separate, sequential decisions inside `captureException`, and
order matters: check the dedupe key first (and always update its timestamp if you proceed
past that check, whether or not sampling later decides to send), *then* call `random()`.
If you sample first and dedupe second, a call that gets unsampled would never update the
dedupe clock, which changes the observable behavior of back-to-back identical errors.

---

Snapshot breadcrumbs with `[...breadcrumbs]` at the moment `captureException` builds the
event — not a reference to the live array. If you hand out the live array, a breadcrumb
added after this error was captured would incorrectly show up on it too, since arrays are
mutated in place.

---

`installReactRootHandlers` is three thin wrappers, each calling
`captureException(error as Error, { componentStack: errorInfo?.componentStack }, '<the matching mechanism string>')`.
The mechanism strings are exactly `'react-boundary'`, `'react-uncaught'`, and
`'react-recoverable'`, matching the order the three options are listed in. Don't pass the
raw `errorInfo` object through as context — only the `componentStack` string off of it.
