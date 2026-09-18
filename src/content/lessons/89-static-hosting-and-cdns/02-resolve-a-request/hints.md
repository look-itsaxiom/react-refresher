Look at the order of checks inside `resolveRequest`. The file-match check
(`if (config.files.includes(path))`) currently runs before the forced
redirect is even looked up. Move the forced-redirect block so it runs
first, right after `path` is computed from trailing-slash normalization.

---

The forced-redirect fix is purely a reordering: cut the block that reads
`const forced = matchRedirect(forcedRules, path); if (forced) return
buildRedirectResponse(config, forced);` and paste it immediately before
the `if (config.files.includes(path))` check. Nothing inside either block
needs to change.

---

For the header bug, compare `defaultHeadersFor`'s `html` branch against
its `hashed` branch just above it — the hashed branch already returns the
right shape. The html branch should return
`{ 'Cache-Control': 'public, max-age=0, must-revalidate' }`, not
`{ 'Cache-Control': 'no-cache' }`.
