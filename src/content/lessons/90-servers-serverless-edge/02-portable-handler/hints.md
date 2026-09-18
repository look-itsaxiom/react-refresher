Start with `matchPath`: split both the pattern and the pathname on `/` and filter out
empty strings (so leading/trailing slashes don't create phantom segments). If the
lengths differ, it's not a match. Walk the arrays together; a `:name` segment always
matches and captures, a literal segment must match exactly.

---

For 404 vs. 405: first collect *every* route whose path matches, regardless of method.
If that list is empty, it's a 404. If it's non-empty but none of them have the right
method, it's a 405 -- and the `Allow` header comes from that same list's methods, not
from all routes in the app.

---

For the error boundary: `ctx.waitUntil(logger(...))` means calling `logger(...)` (which
returns a promise) and handing that promise to `waitUntil` *without* `await`-ing it
yourself. If you write `await logger(...)` before returning the response, the response
will wait on the logger and the check that swaps a deferred in will fail.

---

For `toNodeHandler`, the `Ctx` you build only needs to satisfy the `waitUntil` shape --
push promises into a local array and `Promise.all` them after `app(...)` resolves, before
you touch `res` at all. Build the request URL as a plain string:
`` `http://${req.headers.host ?? 'localhost'}${req.url}` ``.

---

To copy headers from a `Response` onto the Node-style `res`, use
`response.headers.forEach((value, key) => res.setHeader(key, value))` -- `Headers` is
iterable but `forEach` reads better here. Read the body with `await response.text()`
and pass that string straight to `res.end(...)`.
