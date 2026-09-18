# Grade a token-storage plan, and hold a token safely in memory

`App.tsx` has two independent parts. Both are currently unimplemented.

## Part 1 — `storageRisk(plan: StoragePlan): RiskAssessment`

```ts
type StorageOption = 'memory' | 'localStorage' | 'sessionStorage' | 'httpOnlyCookie' | 'bff';
type CsrfDefense = 'sameSite' | 'token' | 'fetchMetadata' | 'none';
type XssRisk = 'low' | 'medium' | 'high';
type StoragePlan = {
  accessToken: StorageOption;
  refreshToken: StorageOption;
  csrfDefense: CsrfDefense;
  xssRisk: XssRisk;
};
type AttackerCapability = 'xss' | 'physicalDevice' | 'csrf';
type Grade = 'A' | 'B' | 'C' | 'D' | 'F';
type RiskAssessment = {
  stealsAccessToken: AttackerCapability[];
  stealsRefreshToken: AttackerCapability[];
  grade: Grade;
  recommendations: string[];
};
```

### Which capability reaches which storage option

For a single `StorageOption`, independent of the other token:

- **`xss`** reaches it if the option is `'memory'`, `'localStorage'`, or `'sessionStorage'`
  (anything a page script can read) — never `'httpOnlyCookie'` or `'bff'`.
- **`physicalDevice`** reaches it if the option is `'localStorage'`, `'sessionStorage'`,
  or `'httpOnlyCookie'` (anything that lands on disk) — never `'memory'` or `'bff'`.
- **`csrf`** reaches it only if the option is `'httpOnlyCookie'` **and**
  `plan.csrfDefense === 'none'` — a defense in place means CSRF no longer reaches it,
  and no other option is ever ambiently attached to a forged request.

Compute `stealsAccessToken` from `plan.accessToken` and `stealsRefreshToken` from
`plan.refreshToken`, each using the *same* `plan.csrfDefense`. Order within each array
doesn't matter.

### Grading

Start at `score = 100` and apply every rule that matches (they stack):

- `-40` if either token uses `'localStorage'`.
- `-20` if either token uses `'sessionStorage'`.
- if either token is JS-readable (`'memory'`, `'localStorage'`, or `'sessionStorage'`):
  `-20` when `xssRisk === 'high'`, `-10` when `'medium'`, `0` when `'low'`.
- `-25` if either token is `'httpOnlyCookie'` and `csrfDefense === 'none'`.

Map the final score to a grade: `>= 90` → `'A'`, `>= 75` → `'B'`, `>= 55` → `'C'`,
`>= 35` → `'D'`, otherwise `'F'`.

### Recommendations

Build the list in this order, including only the ones that apply, and falling back to a
single message when none do:

1. Either token uses `'localStorage'` → a message mentioning `localStorage`.
2. Either token uses `'sessionStorage'` → a message mentioning `sessionStorage`.
3. Either token is `'httpOnlyCookie'` with `csrfDefense === 'none'` → a message mentioning
   a CSRF defense.
4. `plan.accessToken` is neither `'memory'` nor `'bff'` → a message recommending memory
   or a BFF for the access token specifically.
5. If none of the above applied → a single message saying the plan already matches the
   recommended pattern.

## Part 2 — `TokenHolder`

A component that holds an access token entirely in memory (a module-level variable, not
React state, so it survives what a re-render would otherwise reset — but note it's still
*reset per test*, since the sandbox re-evaluates the module fresh each time). It receives
two functions as props:

```ts
type ApiResult = { status: number; body: string };
type Api = (token: string | null) => Promise<ApiResult>;
type Refresh = () => Promise<string>;
```

On a button click:

1. Call `api(currentToken)`.
2. If the result's `status` is `401`, call `refresh()`, store what it returns as the new
   current token, and call `api(newToken)` again.
3. Render the final result. Never write the token anywhere but the in-memory variable —
   in particular, never touch `localStorage` or `sessionStorage`.

Also export `getAccessToken(): string | null` that reads the same module-level variable,
so a caller (or a check) can inspect it directly without going through the DOM.
