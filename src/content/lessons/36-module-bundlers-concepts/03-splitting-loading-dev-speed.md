# Splitting, loading, and dev speed

A single bundle containing your entire app is simple but wasteful: a visitor who never
opens the settings page still downloads its code. The fix is **code splitting**, and it
changes how the browser loads your app, how the dev server serves it, and what has to
happen for a code change to show up without a full reload.

## Code splitting: where the boundaries come from

Every `import()` call (as opposed to a static `import` statement) is an **async
boundary**. The bundler can't know at build time whether that branch runs, so instead of
inlining the target module, it emits it as a **separate chunk** and rewrites the call
into something that fetches that chunk and resolves once it evaluates. `React.lazy` and
`react-router`'s lazy route loaders are just call sites for this — the splitting
decision itself is the bundler's, triggered by the dynamic `import()` syntax appearing
anywhere in the graph, including inside a library you didn't write.

Splitting isn't just "one chunk per dynamic import," though. If routes `/a` and `/b` are
both lazy-loaded and both import a large shared `chart-library`, naively including it in
both chunks means downloading it twice (once cached, but still parsed twice on cold
loads across sessions). Rollup's algorithm — which Vite inherits for production builds —
instead promotes a module reachable from **two or more** async boundaries into its own
shared chunk, so `/a` and `/b` each fetch a small chunk plus the shared one, which the
browser now only downloads and parses once. A module reachable from the *entry* chunk
directly, even if some async chunk also imports it, stays in the entry chunk — it's
already going to be loaded eagerly, so promoting it elsewhere is pure overhead. This is
the same shape you're about to implement.

Framework or app code can nudge this further with `manualChunks` (Rollup/Vite) — a
function or map that forces specific modules into named chunks regardless of the
default heuristic, useful for pinning a vendor bundle (`react`, `react-dom`) to a chunk
that changes far less often than your app code, so its hash — and therefore its cache
entry — stays stable across deploys. Once chunks exist, `<link rel="modulepreload">`
(emitted automatically by Vite for a route's dependencies) tells the browser to fetch and
parse a chunk before it's actually requested by an `import()`, hiding the network
round-trip behind whatever else the page is doing.

## Two different dev-server models

Splitting matters for production, but it's also where the biggest dev-experience split
in the ecosystem shows up. A **bundled dev server** (webpack, and Turbopack in its
webpack-compatible mode) builds the same kind of bundle for development that it builds
for production — smaller and faster to rebuild than a prod build, but still a bundle,
so a codebase with thousands of modules pays a startup cost proportional to its size
before the first page paint.

Vite's dev server instead serves **native ESM, unbundled**: your source files are served
essentially as-is, and the browser's own module loader issues one HTTP request per
import, resolved on the fly. Startup cost is roughly proportional to what a single page
actually needs, not the whole app. The catch is `node_modules`: a package like
`lodash-es` (a good fit for this) is fine, but a large CJS-based dependency that
internally spans hundreds of small files would mean hundreds of requests. Vite's
**dependency pre-bundling step** (esbuild-powered) solves this once at startup by
converting each such dependency into a single flattened ESM file cached in
`.vite/deps/`, so your own source stays unbundled while third-party code doesn't create
a request storm.

## HMR mechanics and Fast Refresh's rules

**Hot Module Replacement** swaps a changed module in-place without a full page reload,
which only works because of the module graph's shape: when a file changes, the dev
server walks *up* the graph from that file toward the entry, looking for the nearest
ancestor that has opted in via `import.meta.hot.accept()`. If one is found before
reaching the entry, only that subtree needs to reevaluate; if not, HMR gives up and
triggers a full reload. A plugin (like `@vitejs/plugin-react`) calls `accept()` on your
behalf for component modules so you don't write it by hand.

React's **Fast Refresh** is a specific policy layered on top of generic HMR: a module
boundary is eligible for a fast, state-preserving swap only if it exports nothing but
React components (plus a few safe exceptions). Add a non-component export — a constant,
a hook defined and used only in that file, a class — and the *entire module* falls back
to losing state on that edit, because there's no way to hot-swap a function export
without also either keeping stale closures around or discarding the component tree that
captured them. This is why the convention "one component per file, hooks and constants
in their own files" survives contact with real projects: it's not just organization, it's
what keeps Fast Refresh's fast path available.

## ESM/CJS interop and env replacement

A bundler that supports both module systems has to fake ESM semantics on top of CJS.
Babel- and TypeScript-compiled output marks a module `exports.__esModule = true` so a
consumer's interop helper (`_interopRequireDefault`) knows the module's `default` export
is really at `.default`, not the whole `exports` object — without that flag, `import x
from './cjsThing'` would bind `x` to the entire `module.exports`, silently wrong.
This course's own sandbox has to solve the same problem for the fake `@server/*`
modules it hands to your code — look at the `esm()` helper in `src/sandbox/modules.ts`,
which wraps a plain object in exactly the shape a real interop helper expects.

Separately, `import.meta.env.MODE` and friends aren't runtime lookups — Vite's `define`
mechanism does textual replacement at build time, so `if (import.meta.env.DEV)` becomes
`if (true)` (or `false`) before minification even runs, letting the minifier delete the
dead branch entirely. That's also why an env value has to be statically referenced
(`import.meta.env.FOO`, not `import.meta.env[key]`) to be replaced.

## Reading a bundle analysis

A treemap from `rollup-plugin-visualizer` or `vite-bundle-visualizer` shows chunk size by
module, which answers "what's big" but not "why is it here." The two follow-up questions
that matter: is this module in the entry chunk when it should be behind an `import()`,
and is it duplicated across chunks because it's *just* under the two-importer threshold
for promotion, or because two different versions of the same package got resolved.

## Further reading

- [Vite — Dependency Pre-Bundling](https://vite.dev/guide/dep-pre-bundling)
- [Vite — HMR API](https://vite.dev/guide/api-hmr)
- [Rollup — Output options: manualChunks](https://rollupjs.org/configuration-options/#output-manualchunks)
- [React — Fast Refresh](https://github.com/facebook/react/tree/main/packages/react-refresh)
