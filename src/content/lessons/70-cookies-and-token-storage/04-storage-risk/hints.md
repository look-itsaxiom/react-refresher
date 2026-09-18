For `storageRisk`, write a small local helper first —
`capabilitiesFor(option, csrfDefense)` — that returns the `AttackerCapability[]` for one
`StorageOption` using the three independent rules from the prompt, then call it twice:
once with `plan.accessToken`, once with `plan.refreshToken`. Keeping that logic in one
place means you only have to get the three `if`s right once.

---

For the score, compute a handful of booleans up front —
`anyLocalStorage`, `anySessionStorage`, `anyJsReadable`, `anyCookieBorne` — each an `||`
or `.some()` over `[plan.accessToken, plan.refreshToken]`, then apply each `-N` as its
own `if` against those booleans. Don't special-case which token triggered it; the
scoring rules don't care which one it was, only whether *either* token matches.

---

The `xssRisk` penalty only applies when `anyJsReadable` is true — a plan with both
tokens as `'httpOnlyCookie'` should take **no** XSS penalty regardless of the
`xssRisk` field, because there's nothing JS-readable for XSS to reach.

---

For `TokenHolder`, keep the token in a variable declared at module scope (outside the
component function), not in `useState` — state is what you use for values that should
trigger a re-render and get reset on remount; this token should persist across
re-renders of the same mounted component without appearing in React's state tree at
all. `getAccessToken` just returns that same variable.

---

The click handler is a single `async` function: call `api(token)`, check
`result.status === 401`, and if so reassign the module-level variable from
`await refresh()` before calling `api` a second time with the new value. Use React state
only for what you show on screen (`status`, `result`) — never for the token itself.
