# Audit a page's framing and isolation headers, and validate a postMessage handler

`App.tsx` exports two unimplemented functions.

## `isolationAudit(headers, embedContext): AuditResult`

```ts
type Headers = {
  contentSecurityPolicy?: string;   // full CSP string, may or may not contain frame-ancestors
  xFrameOptions?: 'DENY' | 'SAMEORIGIN';
  crossOriginOpenerPolicy?: 'unsafe-none' | 'same-origin' | 'same-origin-allow-popups';
  crossOriginEmbedderPolicy?: 'unsafe-none' | 'require-corp' | 'credentialless';
};
type EmbedContext = {
  pageOrigin: string;             // this page's own origin
  embedderOrigin: string;         // origin attempting to frame this page
  popupOpenedWithNoopener: boolean; // did this page open its popup with noopener?
  popupSameOrigin: boolean;       // is the popup this page opens same-origin to pageOrigin?
};
type AuditResult = {
  framingAllowed: boolean;
  framingReason: string;
  crossOriginIsolated: boolean;
  sharedArrayBufferAvailable: boolean;
  popupRetainsOpener: boolean;
  fixes: string[];
};
```

A `parseFrameAncestors(csp)` helper is provided and already correct — it returns the
list of `frame-ancestors` source tokens (e.g. `["'self'", "https://partner.example"]`)
from a CSP string, or `undefined` if the policy has no `frame-ancestors` directive at
all. Use it; don't reparse the CSP string yourself.

Implement `isolationAudit`:

1. **Framing.** If `parseFrameAncestors` returns a token list (even an empty one), CSP
   governs framing and `X-Frame-Options` is ignored, per the browser precedence rule:
   - an empty list, or a list containing `'none'`, blocks all framing.
   - otherwise, framing is allowed if the list contains `embedderOrigin` exactly, or
     contains `'self'` and `embedderOrigin === pageOrigin`.
   - Set `framingReason` to a short string naming which rule fired.
   - If `parseFrameAncestors` returns `undefined`, fall back to `xFrameOptions`: `'DENY'`
     blocks everything; `'SAMEORIGIN'` allows only `embedderOrigin === pageOrigin`.
   - If neither is set at all, framing is allowed from anywhere — say so in the reason.
2. **Cross-origin isolation.** `true` only when `crossOriginOpenerPolicy === 'same-origin'`
   **and** `crossOriginEmbedderPolicy` is `'require-corp'` or `'credentialless'`.
   `'same-origin-allow-popups'` does **not** count, even though it's a stronger setting
   than `'unsafe-none'` — it still permits some live cross-origin window relationships.
3. `sharedArrayBufferAvailable` mirrors `crossOriginIsolated` exactly.
4. **Popup opener.** `false` if `popupOpenedWithNoopener`. Otherwise `false` if
   `crossOriginOpenerPolicy === 'same-origin'` and `!popupSameOrigin` (COOP severs the
   reference for a cross-origin popup). Otherwise `true`.
5. **Fixes**, in this order, each only when it applies:
   - framing is allowed with *no* `frame-ancestors` and *no* `X-Frame-Options` set at
     all → recommend adding `frame-ancestors` to the CSP.
   - not cross-origin isolated → recommend setting COOP `same-origin` and COEP
     `require-corp` (or `credentialless`).
   - `popupRetainsOpener` is `true` and the popup is cross-origin (`!popupSameOrigin`)
     → recommend opening it with `noopener`.

## `validatePostMessage(event, allowedOrigins): { valid: boolean; reason: string }`

```ts
type MessageLike = { origin: string; data: unknown };
```

Check in order, returning on the first that fails:

1. If `allowedOrigins` contains the literal string `'*'`, the allowlist itself is
   broken — `valid: false`, reason mentioning that `'*'` accepts messages from anywhere.
2. If `event.origin` is not in `allowedOrigins`, `valid: false`, reason naming the
   rejected origin.
3. If `event.data` is not a non-null, non-array object with a string `type` property,
   `valid: false`, reason describing the expected shape.
4. Otherwise `valid: true`, with a short confirming reason.
