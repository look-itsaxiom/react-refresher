`planDeploy` already has a `HASHED_SEGMENT` regex defined at the top of
the file but never uses it. Wrap the `purge.push(path)` line in
`if (!HASHED_SEGMENT.test(path)) { ... }` so only unhashed changed paths
get queued for purge.

---

For `previewPolicy`, the `isProduction` branch is already correct. Add an
`else` (or an early return) for the non-production case that returns
`{ robots: 'noindex', requireAuth: true, headers: { 'X-Robots-Tag':
'noindex' } }` instead of the current hardcoded `requireAuth: false,
headers: {}`.

---

Full shape for the non-production branch:

```ts
return {
  robots: 'noindex',
  requireAuth: true,
  headers: { 'X-Robots-Tag': 'noindex' },
};
```
