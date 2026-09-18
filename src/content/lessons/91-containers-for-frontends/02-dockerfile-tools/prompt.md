You'll build two small tools that work on Dockerfile *text*, not real containers — the
sandbox has no Docker daemon, so grading is done by generating and parsing plain strings,
the same way a linter or a codegen script would.

## `generateDockerfile(opts)`

Given typed options, return a complete multi-stage Dockerfile as a string, following the
rules from the previous concept step:

- Three named stages, in order: `deps`, `build`, `runner`.
- `deps` copies **only** the lockfile/manifest, then installs — never the full source —
  so the install layer survives source-only edits.
  - `packageManager: 'pnpm'` → `corepack enable`, then `pnpm install --frozen-lockfile`
    (a `--mount=type=cache` cache mount is fine to include).
  - `packageManager: 'npm'` → `npm ci` (never `npm install`).
- `build` extends `deps`, copies the rest of the source, and runs the build script. If
  `monorepoFilter` is set, scope the build to that workspace package (e.g. with
  `pnpm --filter <name> build`).
- `runner` depends on `kind`:
  - `'spa'` → base image `nginxinc/nginx-unprivileged` (already non-root), copy `dist`
    into `/usr/share/nginx/html`, copy in an `nginx.conf`, `EXPOSE 8080`, exec-form
    `CMD ["nginx", "-g", "daemon off;"]`.
  - `'ssr'` → base image `node:<nodeVersion>-slim`, `ENV NODE_ENV=production`, copy only
    the build output + `node_modules` + `package.json` forward from `build` (never the
    full source), `USER node` when `nonRoot` is true, `EXPOSE 3000`, exec-form
    `CMD ["node", "dist/server.js"]`.
- Add a `HEALTHCHECK` line only when `healthcheckPath` is provided.

## `lintDockerfile(text)`

Given raw Dockerfile text, return an array of finding strings (empty means clean) for
these documented anti-patterns:

1. `COPY . .` appearing before any dependency-install `RUN` line.
2. Shell-form `CMD` (a `CMD` line that doesn't start with `CMD [`).
3. No `USER` instruction anywhere.
4. A `FROM` line pinned to the `:latest` tag.
5. A bare `RUN npm install` line (should be `npm ci` in a reproducible build).
6. An `ENV` line whose variable name looks like a secret (contains `SECRET`, `TOKEN`,
   `PASSWORD`, or `API_KEY`, case-insensitive).

The default export renders whatever `generateDockerfile` produces for one example
configuration in a `<pre>`, followed by its own lint findings — which should be empty,
since well-formed generated output shouldn't trip its own linter.
