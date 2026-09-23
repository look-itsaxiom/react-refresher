# Node, packages, and the dual-package mess

Browsers only had one module system to converge on. Node has two, and most of the pain in
publishing a package in 2026 is still about the seam between them.

## CJS and ESM are different runtimes, not just different syntax

`require()` is synchronous and resolves specifiers with Node's classic algorithm (walk up
`node_modules`, try extensions, check `main`). `import` is asynchronous under the hood,
resolves through the newer package-relative algorithm described below, and gets `exports`/
`module.exports` interop only in specific, narrow cases. A package tells Node which world
its files live in via `"type"` in `package.json`: `"type": "module"` means `.js` files in
that package are parsed as ESM (`.cjs` opts a file back into CommonJS); the default,
`"type": "commonjs"` (or no `type` field at all), means `.js` is CJS and `.mjs` opts into
ESM. The extension and the `type` field together decide the parse mode — there's no
sniffing the file contents.

The big interop change since you last looked closely: **`require()` can now load a real ES
module**, unflagged, since Node 20.19 and 22.12 (and by default in later majors). Before
this, a CJS file that needed an ESM-only dependency had no synchronous option — it had to
either convert to ESM itself or use a dynamic `import()` and deal with the resulting
promise. `require(esm)` removes that wall for the common case, with one sharp edge: if the
target module (or anything it imports, transitively) uses top-level await, `require()`
throws `ERR_REQUIRE_ASYNC_MODULE` — synchronous `require` fundamentally cannot wait on an
async graph, so this one case still forces you to `import()` instead.

## `exports`: the map that replaced `main`

`main` in `package.json` pointed at exactly one entry file, full stop — anything else in
the package was reachable by deep-importing its path directly, which is why so many old
packages have undocumented deep-import surfaces that became de facto public API. `exports`
replaces that with an explicit map:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./client": {
      "import": "./dist/client.mjs",
      "require": "./dist/client.cjs"
    },
    "./package.json": "./package.json"
  }
}
```

Two effects that trip people up the first time: anything not listed in `exports` becomes
unreachable from outside the package — no more silent deep imports into internals — and
condition objects are evaluated **in the order their keys appear in the file**, first
match wins, with `"default"` as an explicit fallback key. `import` vs `require` picks
between ESM and CJS entry points for the same logical module. Beyond those two, Node
supports custom conditions: `"browser"` (bundlers and some runtimes set this),
`"node"`, and increasingly framework-defined ones like `"react-server"`, which React
Server Components tooling (Next.js, and other RSC-capable frameworks) uses to hand a
different module to server-only code than to code that might run in a client bundle. A
consuming tool passes whichever condition strings apply to it; Node itself always
implies `"node"` and `"default"`.

`imports` (plural, no leading dot in the field name but keys always start with `#`) does
the same mapping for a package's *own* internal specifiers — `#internal/logger` inside the
package's own source can point to a different file per condition, which is handy for
swapping an implementation per environment without leaking that swap point into the
public `exports` map.

## The dual-package hazard

If a package ships both an ESM and a CJS build and a consumer's dependency graph somehow
ends up loading *both* — one dependency requires the CJS build, another imports the ESM
build — you get two separate module instances with two separate copies of any module-level
state. A singleton, a `WeakMap` used as a registry, a `Symbol` used as a brand check —
anything that relies on being the *only* instance of that module silently breaks, and the
failure mode is usually "an `instanceof` check that should pass doesn't," discovered
nowhere near where the two builds actually diverged.

`require(esm)` narrows when this can happen — it's now possible for CJS consumers to load
the *same* ESM build a package ships, rather than needing a parallel CJS build just to be
require()-able — but it doesn't eliminate the hazard for packages that still ship two
separate builds with independent state. The safest structural fix is still to keep any
shared, must-be-singleton state in one file that both builds import identically, or to
avoid module-level mutable state in a dual-published package altogether.

Some packages sidestep all of this by shipping **ESM-only**, with no `require` condition
at all — React Router 8 and Storybook 10 both did this, betting that `require(esm)`'s
unflagged availability made a CJS build no longer worth maintaining. That's a real decision
consumers feel: a CJS-only legacy build tool that can't be updated to a version with
`require(esm)` genuinely cannot consume an ESM-only package synchronously.

`"sideEffects": false` in `package.json` is a promise, not an enforcement mechanism: it
tells a bundler that importing any file in this package without using any of its named
exports is safe to drop entirely, enabling tree shaking across the whole package rather
than per-file. Setting it on a package that has an actual side-effecting import (a
CSS import, a polyfill file, anything that mutates a global on load) is a real bug — the
bundler will believe you and delete the import.

## TypeScript's two resolution modes

TypeScript's `moduleResolution` setting decides which of these rules it models when
checking your imports. `"bundler"` assumes a bundler will do the real resolution and
relaxes several ESM-only requirements (no need for explicit file extensions on relative
imports, no enforcement of the dual-package rules) — right for an app whose imports never
run directly in Node. `"nodenext"` models Node's actual algorithm exactly, including
requiring extensions on relative specifiers in ESM files and respecting `exports` maps —
right for a library that will run under `node` unbundled, or a package you're publishing
where getting resolution wrong breaks consumers in ways `tsc` should catch first.

## Publishing checklists

Two community tools catch the mistakes above before they ship: `publint` checks a
package's `package.json` for structural exports/CJS/ESM mistakes (a `main` pointing at a
file that doesn't exist, an `exports` map missing a `require` condition a package.json
`type` implies it needs, and similar), and `arethetypeswrong` (`attw`) checks whether the
*type* resolution for each entry point actually matches the *runtime* resolution —
catching, for instance, a `.d.ts` file that describes the CJS shape while `exports` hands
ESM consumers the ESM build.

## Further reading (optional)

- [Node.js — Modules: Packages (`exports`, `imports`, conditions)](https://nodejs.org/api/packages.html)
- [Node.js — Modules: CommonJS (`require(esm)`)](https://nodejs.org/api/modules.html)
- [TypeScript — Choosing compiler options: `moduleResolution`](https://www.typescriptlang.org/docs/handbook/modules/theory.html)
- [publint](https://publint.dev/) / [arethetypeswrong](https://arethetypeswrong.github.io/)
