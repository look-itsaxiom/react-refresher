Build `generateNginxConf` the same way as the Dockerfile generator: push lines into an
array and `join('\n')`. The `location /` block's contents are the only thing that
branches on `spa` — everything else (the hashed-assets block, the `index.html` block,
`listen`, `server_tokens`) is unconditional.
---
For `securityHeaders` and `compression`, just push a few extra `add_header`/`gzip_*`
lines when the flag is on, and push nothing when it's off — the checks only assert
presence or absence of specific substrings, not exact formatting.
---
For `resolveEnvStrategy`, check the conditions in this order and return as soon as one
matches: (1) `secret && name.startsWith('VITE_')` → reject; (2) `secret` (anything else)
→ server-only; (3) `usedAt === 'build'` → the public build-arg strategy; (4) otherwise →
the runtime strategy. Order matters — a secret named `VITE_STRIPE_KEY` must hit the
reject branch before it ever reaches the generic secret branch.
