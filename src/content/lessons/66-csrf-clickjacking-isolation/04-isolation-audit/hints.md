Pull the framing decision into its own small block of logic (a local function or just a
sequence of `if`s at the top of `isolationAudit`). Call `parseFrameAncestors` first: if
it returns anything other than `undefined` — including an empty array — CSP governs,
and you should never look at `xFrameOptions` in that case. Only fall through to
`xFrameOptions` when `parseFrameAncestors` returned `undefined`.

---

For the `'self'` token, remember it compares the *embedder* to your *own* page's
origin, not to anything else: `token === "'self'" && embedContext.embedderOrigin ===
embedContext.pageOrigin`. A literal origin token like `"https://partner.example"` just
needs a direct string comparison against `embedContext.embedderOrigin`.

---

`crossOriginIsolated` is a single boolean `&&` expression — resist the urge to handle
`'same-origin-allow-popups'` as "partially isolated." It either is `'same-origin'`
exactly, or isolation is `false`.

---

`popupRetainsOpener` reads most simply as three stacked conditions, each returning
early: `popupOpenedWithNoopener` true → `false`. Otherwise, COOP `same-origin` and a
cross-origin popup → `false`. Otherwise → `true`. A nested ternary or three `if`
statements both work.

---

For `validatePostMessage`, the shape check on `event.data` needs three things to all be
true at once: `typeof data === 'object'`, `data !== null` (since `typeof null ===
'object'` in JavaScript), and `!Array.isArray(data)` — then and only then is it safe to
read `data.type` and check it's a `string`. Missing the `null` check is the most common
way this one breaks.
