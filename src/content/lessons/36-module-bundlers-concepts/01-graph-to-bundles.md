# From files to a graph to bundles

You've been running `vite build` (or `next build`, or `tsc` plus a bundler under the
hood) for years without needing to know what happens between "here's my `src/` folder"
and "here's a `dist/` folder with a handful of hashed `.js` files." Debugging a bundle
that's 400KB larger than expected, a source map that points at the wrong line, or a
"module not found" that only happens in the production build all require the same
mental model: a bundler is a pipeline that turns a **module graph** into a small number
of **chunks**, and almost every surprising behavior falls out of one step in that
pipeline.

## Resolution and the module graph

A bundler starts at one or more entry points and asks, for every `import` it sees,
"which file does this specifier actually point to?" That's **resolution**: `'./api'`
might resolve to `./api.ts`, `./api/index.ts`, or (if a `package.json` `exports` field is
involved — see the previous lesson on ES modules) a completely different file depending
on the current condition (`import`, `browser`, `node`). Every resolved edge — module A
imports module B — becomes a node and an edge in a directed graph. Circular imports
(A imports B, B imports A) are legal; the bundler just has to notice the cycle and stop
re-visiting a module it's already processing, not treat it as an error.

Before a file's imports can even be scanned, most of it needs a **transform**: strip
TypeScript types, compile JSX to `React.createElement`/`jsx()` calls, downlevel syntax
the target doesn't support. This course's own sandbox runs exactly this step — the
Sucrase-based pipeline in `src/sandbox/transform.ts` strips types and JSX from every
exercise you submit before it's ever evaluated, which is the same job Vite's esbuild
transform or a `swc`/`babel` step does for a real app, just without emitting a full
resolved graph across files.

## Tree shaking: why ESM and CJS aren't equivalent here

Once the graph is built, a bundler wants to include only the exports that are actually
used. **Tree shaking** depends on **static analysis**: `import { formatDate } from
'./utils'` names a binding at parse time, before any code runs, so the bundler can prove
`formatDate` is used and every other export from `./utils` is dead, and delete it.

This is precisely what CommonJS defeats. `const utils = require('./utils')` returns an
opaque object at *runtime*; `module.exports.formatDate = ...` is an assignment a bundler
would have to execute to know about. There's no static list of "exports" to diff against
"imports" — CJS interop, covered later in this lesson, has to assume the whole module
might be needed. This is the single biggest reason a legacy CJS dependency bloats a
bundle far more than an ESM-native equivalent, independent of actual code size.

Two more tools narrow what "used" means:

- **`sideEffects` in `package.json`.** Even if a bundler can prove an export is unused,
  it still can't delete the module if evaluating it does something observable (registers
  a global, patches a prototype, injects CSS). `"sideEffects": false` in a package's
  `package.json` is a promise to the bundler — "every file in this package is safe to
  drop if nothing imports from it" — that unlocks per-file dropping instead of
  per-package. `"sideEffects": ["*.css"]` scopes the promise to everything except CSS
  files.
- **Pure annotations.** `/* @__PURE__ */ someFunction()` tells the bundler "this call has
  no side effects; delete it if the result is unused," for cases static analysis alone
  can't prove (a function call, not just an import). Babel- and Rollup-family tooling
  (and therefore esbuild, Rolldown, and Vite) all honor it.

## Minification, source maps, and assets

After shaking, **minification** renames locals, removes whitespace and dead branches,
and folds constants. Terser (JS-based, historically the most thorough) and esbuild's or
oxc's Rust-based minifiers (much faster, slightly less aggressive on edge cases) are the
two families in play; Vite defaults to esbuild for dev and offers either for production
builds.

Minification (and the transform step before it) means the code that ships is nowhere
near the code you wrote. **Source maps** (the v3 format: a JSON file with `sources`,
`sourcesContent`, and a `mappings` string — a compact, VLQ-encoded list of
position-to-position offsets between generated and original code) are how a browser
DevTools panel, or an error-tracking tool like Sentry, shows you your original TypeScript
line instead of one minified line containing your entire app. A `//# sourceMappingURL=`
comment at the end of the bundle points to the map; production builds usually upload the
map to the error tracker and *don't* ship it publicly, so stack traces get symbolicated
server-side without exposing source to every visitor.

Non-JS assets (images, fonts, CSS) get their own graph nodes: a bundler rewrites
`import logo from './logo.png'` into a URL pointing at a **content-hashed** filename
(`logo.3f8a1c2.png`), which is what makes it safe to cache assets forever at the CDN
layer — the filename itself changes only when the content does.

## Targets and polyfills

None of this happens against an abstract "JavaScript" — it happens against a **target**:
a `browserslist` query or an explicit list of engines, resolved against [Baseline](
https://web.dev/baseline) feature support. The transform step downlevels syntax the
target can't run (optional chaining, `??`, class fields) and a separate polyfill step
(when needed) fills in missing *runtime* APIs (`Array.prototype.at`, `structuredClone`).
Narrowing the target is one of the highest-leverage bundle-size levers available — every
feature that's already Baseline-supported for your actual audience is code the bundler
never needs to emit a fallback for.

## Further reading (optional)

- [web.dev — Baseline](https://web.dev/baseline)
- [Rollup — Tree-shaking](https://rollupjs.org/introduction/#tree-shaking)
- [webpack — `sideEffects`](https://webpack.js.org/guides/tree-shaking/)
- [Source Map spec (v3)](https://tc39.es/source-map/)
