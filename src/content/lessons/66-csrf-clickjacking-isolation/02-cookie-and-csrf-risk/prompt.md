# Decide whether the cookie gets sent, and whether the endpoint is exposed

`App.tsx` exports two functions, both currently unimplemented (they always return a
placeholder). Implement each as a decision table that mirrors real browser and CSRF
behavior from the concept step.

## `cookieSent(cookie, request): boolean`

```ts
type SameSite = 'Strict' | 'Lax' | 'None';
type Cookie = { name: string; sameSite: SameSite; secure: boolean; partitioned: boolean };
type Request = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  initiatorUrl: string;
  targetUrl: string;
  topLevelNavigation: boolean; // true = link click, form submit, redirect; false = fetch/XHR/img/iframe subresource
  ageOfCookieSeconds: number;  // how long ago the cookie was Set-Cookie'd
};
```

A `siteOf(url)` helper is provided and already correct — use it, don't reimplement it.
It returns `{ scheme, site }` for schemeful same-site comparison (a simplified eTLD+1:
last two hostname labels, which is good enough for the fixtures here even though a real
implementation needs the public suffix list for domains like `co.uk`).

Implement `cookieSent` in this order:

1. A `SameSite=None` cookie that isn't `Secure` is invalid and is never sent (browsers
   reject the `Set-Cookie` outright).
2. A `Secure` cookie is only sent on requests whose **target** scheme is `https`.
3. Compute schemeful same-site between `initiatorUrl` and `targetUrl` using `siteOf`
   (same scheme *and* same site → same-site request). A same-site request always
   carries the cookie (once rules 1–2 pass).
4. For a cross-site request, branch on `sameSite`:
   - `'Strict'` → never sent.
   - `'None'` → always sent (once rules 1–2 pass). `partitioned` doesn't change this
     boolean — partitioning is about which cookie *jar* the browser reads from, not
     whether a matching cookie in that jar gets attached.
   - `'Lax'` → sent only if `topLevelNavigation` is `true`, and then only if the method
     is `'GET'` outright, **or** the method is `'POST'` and `ageOfCookieSeconds <= 120`
     (the Lax+POST exception). Any other method, or `topLevelNavigation: false`
     (a `fetch`, an `<img>`, an iframe load), never carries a `Lax` cookie cross-site.

## `csrfRisk(endpoint): { classification: 'protected' | 'exposed'; reasons: string[] }`

```ts
type Endpoint = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  sideEffects: boolean;     // does calling it change server state?
  cookieAuth: boolean;      // does it rely on an ambient cookie for auth?
  sameSite: SameSite;
  checksOrigin: boolean;    // verifies Origin (or Sec-Fetch-Site) on the request
  checksFetchMetadata: boolean;
  csrfToken: boolean;       // requires a synchronizer/double-submit token
};
```

Classify, checking in this order and stopping at the first that applies:

1. `!cookieAuth` → `protected`, reason `'no ambient-cookie auth; classic CSRF does not apply here (check XSS/token-theft exposure separately)'`.
2. `csrfToken` → `protected`, reason `'a CSRF token is required and validated'`.
3. `checksOrigin || checksFetchMetadata` → `protected`, reason naming whichever check
   is present (`'the endpoint verifies the Origin header'` and/or
   `'the endpoint verifies Sec-Fetch-Site'` — include both reasons if both are true).
4. `sameSite === 'Strict'` → `protected`, reason `'SameSite=Strict cookies are never sent cross-site, including top-level navigations'`.
5. `!sideEffects` → `protected`, reason `'no state change to forge'`.
6. Otherwise → `exposed`. Pick the reason to match `sameSite`:
   - `'None'` → `'SameSite=None sends the cookie on every cross-site request; nothing else here blocks a forged one'`.
   - `'Lax'` and `method === 'GET'` → `'a state-changing GET can be reached by any link, redirect, or GET form; SameSite=Lax still allows cross-site top-level GET navigation'`.
   - `'Lax'` and `method !== 'GET'` → `'a cross-site HTML form POST is a top-level navigation; the temporary Lax+POST allowance can still attach a recently-set cookie, and nothing else here blocks it'`.

`reasons` should contain exactly the reason string(s) described for the branch that
applied — one string in every case except step 3 when both origin and Fetch Metadata
checks are present, which reports both.
