Do the `secFetchSite` check first, before touching cookies or sessions at all -- it's a
cheap, unconditional rejection. `request.secFetchSite !== undefined && request.secFetchSite !== 'same-origin' && request.secFetchSite !== 'none'` is the exact condition.

---

For the dedup requirement in step 3, keep a `Map<string, Promise<Tokens>>` of in-flight
refreshes in the closure (keyed by session id), the same "store the promise before
awaiting it" trick from the request-cache exercise a few lessons back: if a refresh is
already in flight for this session id, `await` and reuse that existing promise instead of
calling `tokenBroker.refresh` again; otherwise start one, store the promise immediately,
and clean the map entry up once it settles (in a `.finally` or after the `await`) so a
*later*, non-concurrent call can trigger its own refresh if needed.

---

`login` and `logout`'s `Set-Cookie` strings are exact literals the checks compare
against -- copy the format from the prompt precisely, substituting only the session id
in `login`. Getting `HttpOnly; Secure; SameSite=Lax; Path=/` right (order and all) is part
of the check.

---

`proxy`'s upstream call should spread `request.headers` first and then set
`Authorization` after, so your added header can't be silently overwritten by something
already in `request.headers` (and, realistically, so a client-supplied `Authorization`
header on the inbound request never survives to the outbound one).
