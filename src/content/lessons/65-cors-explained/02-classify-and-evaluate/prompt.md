Implement three pure functions in `App.tsx` that model the three phases of a cross-origin
request: what kind of request it is, whether the preflight (if any) approves it, and whether the
actual response can be read.

```ts
type CorsRequest = {
  origin: string;
  targetOrigin: string;
  method: string;
  headers: Record<string, string>;
  credentials: 'include' | 'same-origin' | 'omit';
};

type CorsResponse = { headers: Record<string, string> };
type PreflightResponse = { status: number; headers: Record<string, string> };

function classifyRequest(req: CorsRequest): 'same-origin' | 'simple' | 'preflighted';
function evaluatePreflight(
  req: CorsRequest,
  res: PreflightResponse,
  browser?: 'chrome' | 'firefox',
): { allowed: boolean; reason: string; maxAgeApplied: number };
function evaluateResponse(req: CorsRequest, res: CorsResponse): { allowed: boolean; reason: string };
```

1. **`classifyRequest`** — apply the Fetch standard's rules for a "simple" (CORS-safelisted)
   request:
   - Same `origin` and `targetOrigin` (compare the strings directly, both are already origins)
     is `'same-origin'` — no CORS check applies at all.
   - Otherwise, if the method isn't `GET`, `HEAD`, or `POST`, it's `'preflighted'`.
   - Otherwise, check every header name (case-insensitively) against the five safelisted headers:
     `accept`, `accept-language`, `content-language`, `content-type`, `range`. Any other header
     name makes it `'preflighted'`.
   - If `content-type` is present, its MIME type (the part before any `;` — ignore
     `charset`/`boundary` parameters) must be one of `application/x-www-form-urlencoded`,
     `multipart/form-data`, or `text/plain`; anything else is `'preflighted'`.
   - If `accept`, `accept-language`, or `content-language` is present and its value is longer
     than 128 characters, that's `'preflighted'` too.
   - Otherwise it's `'simple'`. `credentials` never affects classification.

2. **`evaluatePreflight`** — given the preflight `OPTIONS` response, decide whether the browser
   accepts it:
   - A non-2xx `status` fails with reason `'preflight response was not successful'`.
   - `Access-Control-Allow-Origin` (case-insensitive header lookup) must be `*` or exactly
     `req.origin`; otherwise fail with `'origin not allowed by preflight'`.
   - `req.method` must appear in a comma-separated `Access-Control-Allow-Methods`
     (case-insensitive, trim whitespace); otherwise fail with `'method not allowed by preflight'`.
   - Every header in `req.headers` that is *not* one of the five safelisted headers must appear
     in a comma-separated `Access-Control-Allow-Headers`; otherwise fail with
     `'header not allowed by preflight'` (include the offending header name in the reason).
   - Otherwise, `allowed: true`, `reason: 'preflight approved'`.
   - `maxAgeApplied` is always computed: parse `Access-Control-Max-Age` as an integer (default
     `5` if missing or invalid), then clamp it to the browser's cap — 7200 for `'chrome'`
     (the default `browser`), 86400 for `'firefox'`.

3. **`evaluateResponse`** — given the actual response, decide whether the calling script can read
   it:
   - `classifyRequest(req) === 'same-origin'` is always `allowed: true, reason: 'same-origin'`.
   - Missing `Access-Control-Allow-Origin` fails with `'missing Access-Control-Allow-Origin'`.
   - If `req.credentials === 'include'`: `Access-Control-Allow-Origin: *` fails with
     `'wildcard origin cannot be used with credentials'`; a mismatched origin fails with
     `'origin does not match Access-Control-Allow-Origin'`; and a missing or non-`'true'`
     `Access-Control-Allow-Credentials` fails with `'missing Access-Control-Allow-Credentials'`.
   - If `req.credentials` is not `'include'`: `*` or an exact origin match both succeed; anything
     else fails with `'origin does not match Access-Control-Allow-Origin'`.

`App.tsx` renders a small results table driven by a fixture list — extend it if useful, but
don't remove the rendering, it's how the preview shows your work.
