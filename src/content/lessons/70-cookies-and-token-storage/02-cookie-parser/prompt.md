# Parse, validate, and serialize a `Set-Cookie` header

`App.tsx` exports three functions. Implement all three against the shared `ParsedCookie`
shape:

```ts
type SameSite = 'Strict' | 'Lax' | 'None';
type Priority = 'Low' | 'Medium' | 'High';
type ParsedCookie = {
  name: string;
  value: string;
  domain: string | null;   // lowercased, leading dot stripped; null if absent
  path: string | null;
  expires: string | null;  // raw attribute value, unparsed
  maxAge: number | null;
  secure: boolean;
  httpOnly: boolean;
  sameSite: SameSite | null;
  partitioned: boolean;
  priority: Priority | null;
  expiryBasis: 'max-age' | 'expires' | 'session';
};
```

## `parseSetCookie(header: string): ParsedCookie`

Split the header on `;`. The first segment is `name=value` (split at the *first* `=`
only — a value may itself contain `=`). Every later segment is an attribute: some are
boolean flags with no `=` (`Secure`, `HttpOnly`, `Partitioned`), the rest are `Key=Value`.
Attribute names are **case-insensitive** (`SECURE`, `secure`, and `Secure` all set the
same flag; `SameSite=lax` and `SameSite=Lax` both normalize to `'Lax'`). Ignore any
attribute name you don't recognize.

- `Domain=Example.com` → `domain: 'example.com'` (strip a leading `.` if present, lowercase).
- `Max-Age=<n>` → parse as a number; ignore it (leave `maxAge: null`) if it doesn't parse.
- `SameSite=<strict|lax|none>` (any case) → the matching `'Strict' | 'Lax' | 'None'`.
- `Priority=<low|medium|high>` (any case) → the matching `'Low' | 'Medium' | 'High'`.
- Set `expiryBasis` from what you parsed: `'max-age'` if `maxAge` is not `null`,
  else `'expires'` if `expires` is not `null`, else `'session'`. **This is the Max-Age-
  over-Expires precedence rule from RFC 6265bis** — when a header sets both, the browser's
  actual behavior is governed by `Max-Age`, so `expiryBasis` reports that even though you
  still keep both raw values on the object.

## `serializeCookie(cookie: ParsedCookie): string`

The inverse: produce a `Set-Cookie`-shaped string from a `ParsedCookie`. Start with
`name=value`, then append only the attributes that are actually set (skip `null`/`false`
ones), in this order: `Domain`, `Path`, `Expires`, `Max-Age`, `Secure`, `HttpOnly`,
`SameSite`, `Partitioned`, `Priority`, each separated by `; `. It does not need to be
byte-identical to some canonical form — it needs to round-trip: parsing your serialized
string back should reproduce the same `ParsedCookie` (`expiryBasis` included).

## `validateCookie(cookie: ParsedCookie, opts: { requestUrl: string }): string[]`

Return **every** applicable violation as a human-readable string (not just the first
one). An empty array means the cookie is valid for that request. Rules, independent of
each other:

1. If `cookie.name` starts with `__Host-`: violate if not `secure`, violate if `domain`
   is set at all, violate if `path !== '/'` (three separate possible violations).
2. If `cookie.name` starts with `__Secure-` and not `secure`: violate.
3. If `sameSite === 'None'` and not `secure`: violate.
4. If `partitioned` and not `secure`: violate.
5. If `secure` and `opts.requestUrl` is not `https`: violate.
6. If `cookie.name.length + cookie.value.length > 4096`: violate.
7. If `domain` is set and it is **not** a suffix of `opts.requestUrl`'s hostname (equal,
   or the hostname ends with `.` + domain): violate.

Use exact strings your own code recognizes — the checks match on keywords like
`__Host-`, `Domain`, `4096`, and `Secure`, not on an exact sentence, so phrase each
violation clearly around its rule.
