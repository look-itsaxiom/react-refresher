# Images that build fast and stay small

Lesson 89 covered static hosts and lesson 90 covered servers, serverless, and edge
runtimes. A container sits underneath any of those: it's how you package a build so it
runs the same way on your laptop, in CI, on a PaaS like Railway, Render, or Fly.io, or on
a Kubernetes cluster. You reach for one when you're self-hosting an SSR framework (Next.js,
React Router 7/8, TanStack Start), when a monorepo needs a reproducible build environment
across a team, or when a target platform simply wants a Dockerfile. If you're shipping a
plain SPA to a CDN, lesson 89's static-host path is simpler and usually correct — a
container is overhead you pay for control you may not need.

## Layers and cache order

A Docker image is a stack of layers, each one the diff produced by a single instruction.
Layers are cached by content hash: if an instruction's inputs haven't changed, Docker
reuses the cached layer instead of re-running it. This makes instruction *order* a
performance decision, not just a style choice. The classic mistake is copying the whole
project before installing dependencies:

```dockerfile
COPY . .
RUN npm ci
```

Now every source edit — even a one-line component change — invalidates the layer above
it, so `npm ci` reruns from scratch on every build. The fix is to copy only what the
install step actually reads first:

```dockerfile
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
```

Dependencies only get reinstalled when the manifest or lockfile changes; source edits
only invalidate the layers after `COPY . .`. This is the single highest-leverage habit in
frontend Dockerfiles.

## Multi-stage builds

A multi-stage Dockerfile uses more than one `FROM` and names each stage with `AS`, then
copies only the artifacts you need forward with `COPY --from=<stage>`. The shape that
fits almost every frontend project is three stages: `deps` (install), `build` (compile),
and `runner` (the thing that actually ships). The `runner` stage never contains your
`devDependencies`, your source `.ts` files, or your build cache — just the output and
whatever runtime the output needs. This is also how a Node build produces an nginx-served
SPA image *or* a slim Node SSR image from the same `build` stage, just with a different
`runner`.

## Base images

`node:24-slim` (Debian-based, minimal) is the safer default for anything with native
dependencies. `node:24-alpine` is smaller but uses musl libc instead of glibc, which
occasionally breaks prebuilt native binaries (Sharp's older builds were a recurring
example) — alpine is a reasonable choice for a pure-JS build, riskier once native modules
are involved. Distroless images go further, stripping the shell and package manager
entirely, which shrinks the attack surface but makes debugging a running container
harder since there's no shell to exec into. As of September 2026, Node 24 is the current
Active LTS line and Node 22 is in Maintenance LTS, so `node:24-*` is the sensible default
for new Dockerfiles unless you're pinned to an older LTS for another reason — verify
against the current Node.js release schedule before committing to a version.

## pnpm specifics

pnpm's Docker guidance centers on `corepack enable` (so the image gets the exact pnpm
version your lockfile expects) and a two-step fetch/install so the dependency layer only
depends on the lockfile, not the full source tree:

```dockerfile
RUN corepack enable
COPY pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm fetch --frozen-lockfile
COPY . .
RUN pnpm install --frozen-lockfile --offline
```

The `--mount=type=cache` flag is a BuildKit feature: it persists pnpm's content-addressed
store *between builds on the same machine* without baking it into any image layer, so
repeat builds skip re-downloading packages entirely. `--frozen-lockfile` (pnpm's
equivalent of `npm ci`) refuses to resolve anything not already pinned — never let a
container build silently update your lockfile. For a monorepo, `pnpm --filter <package>`
narrows an install or build to one workspace package, and `pnpm deploy` can produce a
pruned, self-contained `node_modules` for just that package's production dependencies —
useful when the `runner` stage needs a minimal, non-workspace-shaped `node_modules`.

## Everything else that separates a decent image from a careless one

- **`.dockerignore`** — exclude `node_modules`, `.git`, and build output so they never
  enter the build context, which both speeds up the build and keeps stale local
  artifacts out.
- **Non-root by default** — the official `node` images ship a `node` user; add `USER
  node` in the runner stage instead of running as root.
- **Exec-form `CMD`** — `CMD ["node", "server.js"]` runs the process as PID 1 directly,
  so it receives `SIGTERM` from `docker stop` and can shut down gracefully. `CMD npm
  start` (shell form) runs a shell as PID 1 with your app as a child process; the signal
  goes to the shell, not your app, so the container hangs until Docker's kill timeout.
  If a process manager is unavoidable, `--init` (or bundling `tini`) gives you a minimal
  init process that forwards signals correctly.
- **`HEALTHCHECK`** — lets the orchestrator (Compose, Kubernetes, a PaaS) know the
  container is actually serving, not just running.
- **Build-time vs. runtime env** — Vite inlines any `import.meta.env.VITE_*` variable
  into the bundle at build time; it's fixed at build, not configurable per deployment,
  and it is never a place for a secret since it ends up in client-shipped JS. Runtime
  configuration needs a different mechanism, covered in the next concept step.
- **Multi-arch and supply-chain hygiene** — `docker buildx build --platform
  linux/amd64,linux/arm64` produces one manifest that resolves correctly on both Intel/AMD
  and Arm hosts (including Apple Silicon dev machines and Graviton-class cloud nodes).
  BuildKit can also attach SBOM and provenance attestations to an image, and scanners like
  Trivy or Docker Scout catch known-vulnerable packages before they ship — worth wiring
  into CI once a project is past its first working Dockerfile.

## Further reading

- [Docker: Multi-stage builds](https://docs.docker.com/build/building/multi-stage/)
- [Node.js Docker best practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
- [pnpm: Using pnpm in a Docker container](https://pnpm.io/docker)
- [Docker: Dockerfile best practices](https://docs.docker.com/build/building/best-practices/)
