`decodeJwt`: `token.split('.')` and check `.length !== 3` first. Then
`JSON.parse(base64UrlDecode(segments[0]))` for the header and the same for
`segments[1]` as the payload, each wrapped in its own `try`/`catch` that
rethrows a clearer `Error`.

---

`verifyHs256`: build the signing input as a plain template string —
`` `${headerSegment}.${payloadSegment}` `` — using the raw segments from
`token.split('.')`, not anything you've decoded. `crypto.subtle.importKey`
with `{ name: 'HMAC', hash: 'SHA-256' }`, then `crypto.subtle.sign(...)`
gives you an `ArrayBuffer`; wrap it in `new Uint8Array(...)` before
base64url-encoding it with the helper already in the file. Check
`header.alg !== 'HS256'` and return `false` immediately, before doing any
of the HMAC work.

---

`validateClaims`: build an `errors: string[] = []` array and push onto it
for each failing check, guarding every claim with `typeof payload.x ===
'number'` (or `options.issuer !== undefined`) so an absent claim or unset
option is simply skipped rather than treated as a failure. For `aud`, branch
on `Array.isArray(payload.aud)` and use `.includes(options.audience)` for
the array case, `=== options.audience` otherwise. Return
`{ ok: errors.length === 0, errors }` at the end.
