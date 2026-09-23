# Choosing and migrating

Knowing the Rust wave exists doesn't tell you which tool to reach for on a given
project, or what actually breaks when you move an existing app off webpack. Both are
judgment calls a bundler's marketing page won't make for you.

## A decision guide

- **SPA or component library, no server framework:** Vite 8. It's the default for
  React, Vue, and Svelte tooling now, has the deepest plugin ecosystem, and Rolldown
  means you're not trading dev speed for a slower production build anymore.
- **Next.js, React Router (framework mode), TanStack Start:** you don't choose a
  bundler — the framework bundles it in (Turbopack for Next.js 16+, Vite under the
  hood for React Router and TanStack Start). Fighting the framework's default bundler
  is rarely worth it; work with its config surface instead.
- **An existing webpack app with a large custom loader/plugin stack you can't drop
  quickly:** Rspack (or Rsbuild) first. You get most of the speed win from the Rust
  core while keeping webpack's config shape and most of its plugin ecosystem, which
  buys time to migrate further (or never do the SPA-to-Vite move at all).
- **A CLI tool, a script, or a single-file transform — not an app:** esbuild directly.
  Its API is small and stable, and pulling in Vite for something that isn't a web app
  is unnecessary weight.
- **A publishable npm package (a library, not an app):** tsup (Rollup/esbuild under the
  hood, the incumbent, largest ecosystem) or tsdown (the newer, Rolldown-powered
  successor with the same zero-config DX — ESM+CJS+`.d.ts` output — and materially
  faster builds on packages with many entry points). tsdown is compatible with most of
  tsup's options, so it's a low-risk swap on an existing package if build time in CI is
  a real cost.
- **Monorepo build orchestration** (running many packages' builds/tests in the right
  order, with caching): that's a different layer — Turborepo or Nx — covered in the
  monorepo lesson, not a bundler choice at all.

## Migrating from webpack to Vite, step by step

This is the move most teams actually make, so it's worth walking concretely, in the
order things tend to break:

1. **Entry point.** webpack starts from a JS/TS `entry` field; Vite starts from an
   `index.html` file with a `<script type="module" src="/src/main.tsx">` tag. Move
   whatever your webpack `HtmlWebpackPlugin` template did into that HTML file directly
   — there's no plugin standing between you and it.
2. **`DefinePlugin` → `define`.** webpack's `new DefinePlugin({ 'process.env.API_URL':
   JSON.stringify(...) })` becomes Vite's `define` option in `vite.config.ts`. The
   values on both sides are raw *code* substituted at build time, which is why real
   string values need `JSON.stringify` around them — `define: { API_URL: '"https://
   api.example.com"' }`, not `API_URL: 'https://api.example.com'` (that would splice
   bare, invalid syntax into every reference).
3. **Aliases.** `resolve.alias` carries over almost unchanged in shape between webpack
   and Vite — same keys, same idea (a specifier prefix maps to a filesystem path).
4. **Environment variables.** webpack apps typically read `process.env.SOME_VAR` at
   build time via `DefinePlugin` or `dotenv-webpack`. Vite has this built in through
   `import.meta.env`, but only exposes variables to client code if their name is
   prefixed `VITE_` — an unprefixed `API_URL` in a `.env` file is silently unavailable
   in the browser bundle. This prefix requirement is a deliberate security boundary
   (server-only secrets in a shared `.env` file don't leak into client code by
   accident) and it's the single most common "why is my env var `undefined`" migration
   bug.
5. **CSS.** webpack needed `style-loader` + `css-loader` (+ `sass-loader`, etc.) wired
   up explicitly. Vite handles `.css`, `.scss`, `.less`, and CSS Modules
   (`*.module.css`) out of the box with zero config — importing a stylesheet from a
   component just works. Delete the loader chain; there's nothing to replace it with.
6. **Static assets.** `import logo from './logo.png'` works the same way conceptually
   (content-hashed URL) but webpack's `asset/resource` module rule and Vite's built-in
   asset handling aren't configured identically — check any custom `url-loader`
   size-inlining threshold against Vite's `build.assetsInlineLimit`.
7. **Dynamic imports.** Plain `import('./foo')` needs no change — it's standard ESM,
   and both tools code-split on it identically. The webpack-specific API that has *no*
   direct Vite equivalent is **`require.context(...)`** (glob-import a whole directory
   at once, used for things like auto-registering route modules). Vite's answer is
   `import.meta.glob('./pages/*.tsx')`, which returns an object of specifier to lazy
   import function (or eager module, with `{ eager: true }`) — same job, different
   shape, and it has to be rewritten by hand; there's no automated equivalent.
8. **Web Workers.** webpack's `worker-loader` becomes Vite's built-in
   `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })` syntax —
   no loader needed, but the import syntax changes.
9. **Dev server proxy.** webpack's `devServer.proxy` and Vite's `server.proxy` are
   nearly drop-in replacements for each other — same purpose (forward `/api/*` to a
   backend during local dev), very similar shape.
10. **CommonJS-only dependencies.** This is where most real migration pain concentrates.
    A dependency that only ships CJS, does something unusual at `require()` time
    (conditionally requiring based on `process.env.NODE_ENV`, monkey-patching a
    global), or expects to be `require()`'d rather than statically imported can behave
    differently under Vite/Rolldown's ESM-first interop than it did under webpack's
    more permissive CJS handling. `@rollup/plugin-commonjs`-style interop is built into
    Vite's dependency pre-bundling step, but a genuinely broken package sometimes needs
    an explicit `optimizeDeps.include` or, in stubborn cases, a patched local copy.

## Measuring build performance honestly

Every bundler's marketing page has a "N times faster" number, and most of them are
true for *some* project shape and false for others. Before trusting one for your own
migration decision:

- **Compare cold builds and warm builds separately.** Filesystem caching (Turbopack's
  persistent cache, Rolldown's module-level caching) changes the second-build number
  far more than the first-build number — a benchmark that only reports one is telling
  half the story.
- **Compare on your own dependency graph, not a synthetic one.** A tool that wins big
  on a from-scratch app with 50 dependencies can lose on a five-year-old app with 400,
  a legacy CJS package deep in the tree, or a custom webpack loader with no Rust-side
  equivalent yet.
- **Separate "transform speed" from "full build speed."** A faster minifier doesn't
  help if your bottleneck is actually a slow type-check step running in parallel (or
  blocking) the bundle — profile where time actually goes before attributing a whole
  build's duration to the bundler.
- **Watch memory, not just wall-clock time**, on CI runners with tight memory limits;
  some of the biggest reported wins from the Rust tooling wave are memory reductions
  that let a build fit in a cheaper CI tier at all, which a wall-clock number alone
  won't surface.

## Further reading (optional)

- [Vite — Migration from v5](https://vite.dev/guide/migration)
- [Vite — Backend Integration / env variables](https://vite.dev/guide/env-and-mode)
- [Vite — Rollup-compatible plugin API](https://vite.dev/guide/api-plugin)
- [Next.js 16 — Turbopack](https://nextjs.org/blog/next-16)
