Structure the function as a sequence of early returns: no `origin` → `undefined`. Origin not on
the allowlist (and not a valid wildcard case) → `undefined`. Then branch once on whether this is
a real preflight. Two small, separate header-object literals (one for preflight, one for actual)
are easier to get right than one shared object with fields conditionally deleted.

---

"Is this a preflight" is not just `method === 'OPTIONS'` — a bare `OPTIONS` request with no
`access-control-request-method` header isn't a CORS preflight at all (some apps use `OPTIONS`
for other things, like a health check or a REST "list allowed verbs" convention). Check for the
header's presence too: `'access-control-request-method' in req.headers`.

---

Write a small helper to decide the origin value once, since both the preflight and actual-request
branches need the same decision:

```ts
function resolveOrigin(config: CorsConfig, origin: string): { allowed: boolean; value: string } {
  if (config.allowedOrigins.includes(origin)) return { allowed: true, value: origin };
  if (!config.credentials && config.allowedOrigins.includes('*')) return { allowed: true, value: '*' };
  return { allowed: false, value: '' };
}
```

Note the order: check the exact match first. A config could list both `'*'` and a specific
origin; an exact match should still echo the specific origin rather than fall through to `*`.

---

Remember which headers belong to which phase — this is the part of the exercise checks probe
hardest. `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`, and
`Access-Control-Max-Age` only make sense on the preflight's `OPTIONS` response (they describe
what a *future* real request may do). `Access-Control-Expose-Headers` only makes sense on the
actual response (it describes what the calling script may read out of *this* response).
`Access-Control-Allow-Origin`, `Access-Control-Allow-Credentials`, and `Vary: Origin` apply to
both.
