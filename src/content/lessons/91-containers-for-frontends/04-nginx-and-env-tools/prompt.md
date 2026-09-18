Two more codegen/lint-style tools, graded the same way as the previous exercise: by
parsing generated text and by checking a classification function's output.

## `generateNginxConf(opts)`

```ts
type NginxOptions = {
  spa: boolean;
  hashedAssetsPath: string; // e.g. '/assets/'
  securityHeaders: boolean;
  compression: 'gzip' | 'none';
};
```

Return an nginx `server {}` block as a string, matching the previous concept step:

- Always: `listen 8080;`, `server_tokens off;`, and a `root` directive.
- A `location <hashedAssetsPath> { ... }` block with
  `Cache-Control "public, max-age=31536000, immutable"`.
- A `location = /index.html { ... }` block with `Cache-Control "no-cache"`.
- A `location / { ... }` block: when `spa` is true, it falls back to `index.html` via
  `try_files $uri $uri/ /index.html;`; when `spa` is false, it's a plain static server
  with no SPA fallback — `try_files $uri =404;`.
- When `securityHeaders` is true, add `X-Content-Type-Options`, `Referrer-Policy`, and a
  placeholder `Content-Security-Policy` header.
- When `compression === 'gzip'`, add `gzip on;` plus a `gzip_types` list.

## `resolveEnvStrategy(vars)`

```ts
type EnvVar = { name: string; usedAt: 'build' | 'runtime'; secret: boolean };
type EnvResolution = {
  name: string;
  strategy: 'VITE_public_build_arg' | 'runtime_window_env' | 'server_only_env' | 'reject_public_secret';
  reason: string;
};
```

For each variable, decide the strategy:

- **Secret and named `VITE_*`** → `'reject_public_secret'`. A `VITE_`-prefixed variable
  gets inlined into the client bundle at build time, so it can never hold a secret,
  regardless of what the caller claims about `usedAt`.
- **Secret, any other name** → `'server_only_env'`. Secrets never reach the client;
  they're injected as a plain environment variable read only by server-side code.
- **Not secret, `usedAt: 'build'`** → `'VITE_public_build_arg'`. Safe to bake into the
  bundle at build time via a `VITE_`-prefixed variable.
- **Not secret, `usedAt: 'runtime'`** → `'runtime_window_env'`. Needs to be injected at
  container start (the `envsubst` into a small `window.__ENV__` script pattern), since a
  build-time bake would require a rebuild for every environment.

Each resolution needs a one-sentence `reason` explaining the choice — see the concept
step and the previous exercise for the tone.

The default export renders one `generateNginxConf` call in a `<pre>` and lists the
`resolveEnvStrategy` results for a small fixed set of variables.
