# Serving the two shapes: SPA behind nginx, SSR as Node

A frontend container ships one of two fundamentally different runners: a static file
server for a built SPA, or a long-running Node process for SSR. They have almost nothing
in common at runtime, which is why the previous step's `runner` stage branches on `kind`.

## The nginx SPA config, line by line

An SPA is just files, but a naive static server gets three things wrong: it 404s on a
client-side route, it caches everything (or nothing) the same way, and it leaks
information about itself. A minimal, correct config addresses all three:

```nginx
server {
    listen 8080;
    server_tokens off;
    root /usr/share/nginx/html;

    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location = /index.html {
        add_header Cache-Control "no-cache";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- **`try_files $uri $uri/ /index.html;`** is the SPA fallback: nginx tries the exact
  path, then the path as a directory, then falls back to `index.html` so client-side
  routing (React Router, TanStack Router) can take over instead of nginx 404ing on a
  refresh of `/settings/profile`.
- **Per-location `Cache-Control`** exploits the fact that a Vite build fingerprints
  filenames (`app.a1b2c3.js`), so those files are immutable forever — `max-age=31536000,
  immutable` — while `index.html` itself must always be revalidated (`no-cache`), since
  it's the one file whose content changes without a filename change on every deploy.
  Caching `index.html` long-lived is a classic way to serve a stale app for weeks.
- **`server_tokens off;`** stops nginx from announcing its exact version in error pages
  and the `Server` header — a small hardening step, not a real defense on its own.
- **Compression** needs `gzip on;` plus a `gzip_types` list; Brotli support isn't built
  into stock nginx and needs the separate `ngx_brotli` module (or a base image that
  bundles it) — verify whichever base image you pick actually includes it before relying
  on `Content-Encoding: br`.
- **Security headers** (`X-Content-Type-Options: nosniff`, a `Referrer-Policy`, and a
  `Content-Security-Policy` scoped to what the app actually loads) belong here too, but a
  CSP is application-specific — treat any generated one as a placeholder to tighten, not
  a finished policy.
- **Listening as non-root** on port 8080 (not 80) is why `nginxinc/nginx-unprivileged` is
  worth using over plain `nginx` — port 80 requires root to bind, and running the whole
  web server as root for that reason alone is a bad trade. [Caddy](https://caddyserver.com/)
  is a reasonable alternative to nginx for the same job — its config is notably shorter for
  the common cases (automatic HTTPS, simpler file-server directives) — but it's a less
  universal default in frontend Dockerfiles than nginx as of 2026.

## The Node SSR runner

Next.js's `output: 'standalone'` build mode (and React Router 7/8's framework-mode build)
produce a self-contained `server.js` plus a pruned `node_modules` containing only what
that server needs at runtime — no build tooling, no dev dependencies. The runner stage
just needs to copy that output forward and run it:

```dockerfile
FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
```

The same graceful-shutdown and health-check practices from lesson 90 apply here directly:
the server should handle `SIGTERM` by stopping new connections and finishing in-flight
ones, and a `HEALTHCHECK` (or an orchestrator's own liveness probe) should hit a real
endpoint, not just check that the process is alive.

## Local dev with Compose, and where the container goes after `docker build`

Docker Compose exists for local development, not production topology — a `docker-compose.yml` that bind-mounts your source into a container and runs the dev server with HMR
gives every teammate the same Node version and system dependencies without "works on my
machine" drift, at the cost of some filesystem-watch overhead compared to running
natively. Whichever engine runs it locally — Docker Desktop, or a lighter alternative
like OrbStack, Podman, or Colima — is a separate choice from what runs the built image in
production.

Once an image builds, it needs a registry (GHCR is a common default if you're already on
GitHub) and a place to run it: a PaaS that deploys straight from a Dockerfile (Railway,
Render, Fly.io), or a Kubernetes cluster if the org already runs one. Rough size
expectations, worth verifying against your own build rather than trusting blindly: an
nginx-served SPA image typically lands around 40-60 MB; a slim Node SSR image is usually
in the 150-250 MB range depending on native dependencies. And the recurring judgment
call from lesson 89 still applies here: if the app is a pure SPA with no server-side
logic, a container is solving a problem a static host and CDN already solve for less
operational cost — reach for one when SSR, monorepo reproducibility, or a
container-shaped deployment target actually requires it.

## Further reading (optional)

- [nginx: Module ngx_http_core_module (try_files)](https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files)
- [Next.js: Configuring output file tracing / standalone](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [Docker: Compose overview](https://docs.docker.com/compose/)
- [web.dev: HTTP caching](https://web.dev/articles/http-cache)
