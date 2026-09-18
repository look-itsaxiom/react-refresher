Do the header-name comparisons case-insensitively — real headers arrive in whatever case the
caller used, and the Fetch standard treats header names as case-insensitive throughout. A small
`lookupHeader(headers, name)` helper that scans `Object.keys` with `.toLowerCase()` comparisons
will save you from repeating this in all three functions.

---

For `classifyRequest`, check same-origin first and return immediately — none of the other rules
apply once that's true. Then check the method against a fixed list. Then loop over
`Object.entries(req.headers)` once: for each header, first confirm it's in the safelist at all
(bail to `'preflighted'` if not), then apply the extra `content-type` MIME check and the
128-byte length check only to the headers those rules apply to. Splitting `content-type`'s value
on `';'` and taking `[0]!.trim().toLowerCase()` gets you the bare MIME type without the
`charset`/`boundary` parameter.

---

For `evaluatePreflight`, compute `maxAgeApplied` unconditionally at the top of the function
(before any early return) — the prompt asks for it on both the success and failure paths, and
it's easy to accidentally short-circuit before reaching that line. `parseInt(value, 10)` on a
missing header gives `NaN`; check `Number.isFinite(...)` before trusting it, and fall back to
`5` otherwise.

---

For `evaluateResponse`, get the "same-origin, skip everything" case out of the way by reusing
your own `classifyRequest` — don't re-derive same-origin logic a second time. Then branch once
on `req.credentials === 'include'`: that's the only variable that changes whether `*` is legal
and whether `Access-Control-Allow-Credentials` matters at all.

---

A shape that satisfies every check:

```ts
function lookupHeader(headers: Record<string, string>, name: string): string | undefined {
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key === undefined ? undefined : headers[key];
}

export function classifyRequest(req: CorsRequest): 'same-origin' | 'simple' | 'preflighted' {
  if (req.origin === req.targetOrigin) return 'same-origin';
  if (!['GET', 'HEAD', 'POST'].includes(req.method.toUpperCase())) return 'preflighted';
  for (const [name, value] of Object.entries(req.headers)) {
    const lower = name.toLowerCase();
    if (!SAFELISTED_HEADERS.has(lower)) return 'preflighted';
    if (LENGTH_LIMITED_HEADERS.has(lower) && value.length > 128) return 'preflighted';
    if (lower === 'content-type' && !SAFELISTED_CONTENT_TYPES.has(value.split(';')[0]!.trim().toLowerCase())) {
      return 'preflighted';
    }
  }
  return 'simple';
}
```

Build `evaluatePreflight` and `evaluateResponse` as a sequence of early-return guard clauses, one
per failure reason listed in the prompt, ending in the success case.
