Look at the `font` branch a few lines below the `hashed` branch — it already
returns `'public, max-age=31536000, immutable'`. The `hashed` branch should
return the exact same `cacheControl` string.

---

For the personalized API case, add an `if (asset.personalized) { ... }`
check as the first thing inside the `kind === 'api'` branch, returning
`{ cacheControl: 'private, no-store' }` before falling through to the
shared, cacheable return below it.

---

`bfcacheEligible` should start with `if (usesUnload) return false;` — that
check alone is unconditional, no header involved. Then remove the
`no-store` check on `pageHeaders` entirely (or keep the parameter for shape
but stop branching on it) and return `true` for anything that isn't the
`unload` case.
