# The Rust wave and what it changed

The previous lesson covered what any bundler has to do: resolve a module graph, tree
shake it, split it into chunks, minify, emit source maps. This lesson is about *who does
that work now*, in September 2026, and why almost every tool in this space rewrote its
hot path in a systems language over the last three years.

## Why JS-based tooling hit a ceiling

Babel (transform) and Terser (minify) are written in JavaScript, running on V8 through
Node. That was fine when "compile TypeScript and JSX for a few hundred files" was
milliseconds of work. It stopped being fine as app graphs grew to thousands of modules
and CI pipelines started running that work dozens of times a day. The problem wasn't
V8 being slow in some abstract sense — it was that a tree-walking interpreter doing
string-heavy parsing and AST manipulation, one file at a time, on a single thread,
doesn't parallelize or vectorize the way a natively-compiled parser can. Node's
single-threaded-by-default model made true multi-core parsing awkward to bolt on after
the fact.

**esbuild**, written in Go and released in 2020, was the wake-up call: a JS/TS/JSX
bundler and minifier 10-100x faster than the Babel+Terser+webpack stack, by doing the
parsing, transforming, and code generation in a compiled language with real
multithreading. Vite adopted esbuild for dev-time dependency pre-bundling and TS/JSX
transforms almost immediately, which is a large part of why Vite's dev server felt
instant compared to a webpack-based one even before Rollup was touched.

**SWC**, written in Rust, took the same bet for the transform step specifically and
became Next.js's default compiler in 2021, replacing Babel for the common case
(TypeScript/JSX transform, minification via `swc_minify`). Babel didn't disappear —
Next.js still falls back to it automatically when your project has a custom
`.babelrc`/`babel.config.js`, and the ecosystem's long tail of Babel macros and
highly custom AST transforms (codemods, styled-components' babel plugin in older
versions, some i18n extraction tooling) still has no Rust equivalent. But for the
default path — strip types, compile JSX, downlevel syntax — Rust tooling now owns it.

## Oxc and Rolldown: the current end state for Vite

The team behind Vite and Rollup (VoidZero) spent 2024-2025 building **oxc** — a
Rust toolchain with a parser, resolver, transformer, and minifier, plus a linter
(`oxlint`, covered in the next lesson) — and **Rolldown**, a Rollup-compatible bundler
written in Rust that uses oxc for the language-level work. Rolldown hit its 1.0 release
in early 2026, and **Vite 8**, released March 2026, ships Rolldown as its single
bundler for both dev and production — no more esbuild-for-dev, Rollup-for-build split.
That dual-bundler seam was a real cost: a plugin or an edge case that worked in
Rollup-driven production builds could behave differently against esbuild in dev, and
projects paid for two bundling engines' dependencies and two mental models. Vite 8
collapses it into one, reporting production build times cut by roughly 10-30x on
larger projects and memory use down by up to two orders of magnitude on some builds.

"Rollup-compatible plugin API" is the detail that made this an upgrade rather than a
rewrite for the ecosystem: Rolldown implements (most of) the same `resolveId` /
`load` / `transform` / `generateBundle` hooks Rollup plugins already used, so the
enormous existing library of Rollup and Vite plugins kept working with little or no
change, instead of every plugin author needing to rewrite against a new API. This
course's own `vite.config.ts` is an ordinary Vite 8 config — nothing exotic — but it's
worth reading with this lesson in mind:

```ts
import react from '@vitejs/plugin-react';
// ...
plugins: [react({ compiler: true }), tailwindcss(), progressPlugin()],
```

`@vitejs/plugin-react`'s `compiler: true` option turns on the React Compiler
(auto-memoization, covered in an earlier lesson) as a build-time transform — one more
step now running through the same oxc-based pipeline rather than a separate Babel pass.
`progressPlugin` here is a small custom Rollup-style plugin, and it works unmodified
under Rolldown precisely because of that compatibility promise.

## Turbopack: a different architecture, not just a different language

Next.js's **Turbopack** (Rust, from the Next.js/Vercel team) isn't just "esbuild but for
Next.js" — its distinguishing feature is a function-level incremental compilation
graph. Rather than re-running a whole bundle (or even a whole file's transform) when
one function changes, Turbopack tracks dependencies at a finer grain and only redoes
the work an edit actually invalidates, with results cached to disk so a second `next
dev` after a restart doesn't start from zero. Next.js 16 (released late 2025) made
Turbopack the default for both `next dev` and `next build` — no `--turbopack` flag
needed — reporting builds 2-5x faster than the previous webpack default, and Fast
Refresh 5-10x faster. Next.js 16.3 added persistent filesystem caching for `next build`
on top of that. webpack is still selectable in a Next.js project for plugin
compatibility, but it's no longer what a new project gets by default.

## Rspack: webpack compatibility as the selling point

**Rspack** (Rust, from ByteDance) takes the opposite migration bet from Rolldown:
instead of Rollup's plugin API, it targets webpack's `loader`/`plugin` API and config
shape directly, so an existing webpack project can often point its build at Rspack with
a small config diff and keep most of its loader/plugin stack. **Rsbuild** sits on top
of Rspack the way Vite sits on top of Rolldown — sensible defaults, a plugin system,
framework presets — for teams that want webpack-shaped compatibility with Rust-speed
builds rather than migrating to Vite's dev-server model. Both are 1.0-stable and
actively maintained in 2026.

## Where webpack 5 stands now

webpack 5 is not abandoned — it's still receiving regular minor releases through 2026
(new tree-shaking improvements for CommonJS destructuring, an experimental
`oxc-parser` integration of its own) — but it is no longer the default choice for a new
project in any major framework, and its architecture (a single-threaded JS core,
loader chains resolved per-file) is the thing every tool in this lesson was built to
replace. Existing webpack apps aren't broken and don't need to migrate on any particular
timeline; new apps essentially never choose it as a starting point anymore.

## Further reading (optional)

- [Vite 8.0 is out!](https://vite.dev/blog/announcing-vite8)
- [VoidZero — Announcing Rolldown 1.0](https://voidzero.dev/posts/announcing-rolldown-1-0)
- [Next.js 16 — Turbopack](https://nextjs.org/blog/next-16)
- [Rspack — Introduction](https://rspack.rs/guide/start/introduction)
