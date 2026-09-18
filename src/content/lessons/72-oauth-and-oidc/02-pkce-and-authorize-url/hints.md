`generateVerifier`: check the range first (`length < 43 || length > 128`,
throw). Call `randomSource(new Uint8Array(length))` once to get your bytes,
then build the string with a loop: `UNRESERVED[bytes[i] % UNRESERVED.length]`
for each index, concatenated.

---

`codeChallenge`: `new TextEncoder().encode(verifier)` gives you bytes,
`await crypto.subtle.digest('SHA-256', bytes)` gives you an `ArrayBuffer`.
Wrap that in `new Uint8Array(...)` before passing it to the
`base64UrlEncodeBytes` helper already in the file — don't try to base64
the `ArrayBuffer` directly.

---

`buildAuthorizeUrl`: `const url = new URL(params.issuerAuthorizeEndpoint)`,
then `url.searchParams.set('scope', params.scopes.join(' '))` and similar
`.set(...)` calls for each other param, then `url.toString()`. Don't
`encodeURIComponent` anything yourself — `URLSearchParams` already does it,
and double-encoding is a real bug here.

---

`validateCallback`: `new URL(callbackUrl).searchParams` gets you a
`URLSearchParams` to read from. Write the five checks as early returns, in
the exact order the prompt lists them — a callback that fails `state`
should never even look at `error` or `code`, because an attacker who
doesn't control `state` could otherwise supply a plausible-looking `code`
for a request that isn't yours. The `iss` check only fires when
`options.expectedIssuer` is set AND the callback actually included an `iss`
param — treat a callback with no `iss` at all as "the AS didn't tell us,"
not as a mismatch.
