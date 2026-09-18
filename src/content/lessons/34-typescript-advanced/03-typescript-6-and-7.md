# TypeScript 6 and 7 in practice

TypeScript 6.0 (March 2026) and 7.0 (GA July 8, 2026) are the biggest change to the tool
since ES module support: the compiler was rewritten from its bootstrapped JavaScript
implementation into Go. The language itself barely moved — this is about how fast `tsc`
runs and what quietly stopped working along the way.

## The native compiler

TypeScript 7.0 ships `tsc` as a native Go binary — same command, same flags, same
`tsconfig.json`, a different implementation underneath. Microsoft's own benchmark suite
(VS Code, Playwright, TypeORM, date-fns, tRPC, rxjs) reported 9–13.5x faster full-project
type-checks (VS Code itself at 10.4x), with editor startup on a file with existing errors
dropping from double-digit seconds to about a second. The speedup comes from native code
plus real multithreading —
something the old JS-based `tsc` could never do, since Node's single-threaded model meant
"parallel type-checking" wasn't on the table. `tsc --noEmit` as your CI gate (which this
repo uses via `pnpm typecheck`) goes from the slowest step in the pipeline to one of the
fastest.

Two new flags control that parallelism directly: `--checkers` sets how many worker threads
share the type-checking work (default 4), and `--builders` parallelizes builds across
project references. `--singleThreaded` turns both off, which you'd only want while
debugging a discrepancy between the old and new compiler.

**The catch:** TypeScript 7.0 shipped with no public programmatic compiler API
(`ts.createProgram`, `ts.transform`, and friends) — that's planned for 7.1. Any tool built
against the old API breaks, and the biggest casualty is `typescript-eslint`'s type-aware
rules, which are built directly on that API and can't run against a 7.0 project as of this
writing. The workaround is the `@typescript/typescript6` compatibility package, which
installs a `tsc6` binary and re-exports the old API — you compile with 7.0's `tsc` for
speed and keep type-aware linting running against `tsc6` in the meantime. Watch the 7.1
release notes if your lint config leans on type-aware rules.

## Config defaults that moved in 6.0

TypeScript 6.0 was explicitly a bridge release — "the last one on the old codebase,"
according to the announcement — meant to surface deprecation warnings before 7.0 turned
them into hard errors. The defaults that changed:

- **`strict`** is now `true` by default. A bare `tsc --init` opts a new project into every
  strictness flag instead of none of them.
- **`target`** defaults to the current year's ECMAScript version (a floating target, so it
  moves forward on its own) instead of the ancient `es3`.
- **`module`** defaults to `esnext` instead of `commonjs` — the compiler now assumes you're
  writing ESM unless you say otherwise.
- **`noUncheckedSideEffectImports`** defaults to `true`, catching a bare `import './x'`
  that doesn't actually resolve.
- **`types`** defaults to `[]` instead of auto-including every `@types/*` package in
  `node_modules` — you list what you use.

And a list of options that are deprecated in 6.0 and are hard errors in 7.0:
`target: es5` (the floor is now ES2015), `module: amd/umd/systemjs`, `moduleResolution:
node`/`classic` (use `nodenext` or `bundler`), `esModuleInterop: false`,
`allowSyntheticDefaultImports: false`, `alwaysStrict: false`, `outFile`, and `baseUrl` as a
bare-specifier lookup root (migrate to explicit `paths`). If your `tsconfig.json` predates
2026, run a build against 6.0 first and read every deprecation warning before jumping to 7.

## Flags worth knowing, still true in 7.0

- **`isolatedDeclarations`** requires every exported function and value to carry an
  explicit type instead of leaning on cross-file inference, so its `.d.ts` file can be
  emitted by looking at that one file alone. That's what lets a build tool skip a
  whole-project type-check just to produce declaration files — relevant if you publish a
  package and want declaration emit off the critical path.
- **`erasableSyntaxOnly`** (added in 5.8) rejects TypeScript-only runtime constructs —
  `enum`, `namespace` with runtime code, parameter properties — so every remaining
  TypeScript-specific line is *purely* type syntax that can be stripped by deleting text,
  no transformation needed. This is exactly what Node's built-in type stripping requires:
  Node 22.18+ and 23.6+ run `.ts` files directly by erasing type syntax, with no type
  checking and no transform step, so any construct that needs a transform (a `const enum`,
  a namespace with real code) has to go.
- **`verbatimModuleSyntax`** keeps every import/export exactly as written in the emitted
  JS — no silent elision of "unused" type-only imports — which matters once a bundler or
  Node's loader is deciding module boundaries from the same source you wrote, not from
  what the compiler decided to keep.

Recommended pairing for a Node-executed `.ts` file, no build step: `erasableSyntaxOnly:
true`, `verbatimModuleSyntax: true`, `module: nodenext`, `rewriteRelativeImportExtensions:
true`.

## Linting: type-aware rules still need a type checker

`oxlint`'s pitch is speed from working on syntax alone — no type checker in the loop. That
also means an entire category of rule is permanently out of its reach: anything that needs
to know an expression's actual type, like `no-floating-promises` (is this a `Promise` I
forgot to `await`?) or `no-unnecessary-condition`. `typescript-eslint`'s type-aware rules
answer exactly those questions, at the cost of needing a real program and being
meaningfully slower. The practical setup in most 2026 repos is both: `oxlint` (or Biome) on
every save and every commit for the fast syntactic pass, `typescript-eslint`'s type-aware
rules on a slower CI job or pre-push hook. This repo's `pnpm typecheck` — running raw `tsc
--noEmit` — is the cheapest version of "type information catches a class of bug syntax
checkers can't": it's the gate that fails when a lesson's `solution.tsx` doesn't actually
satisfy the types it claims to.

## What this doesn't change

The language is the same. A component you write today targeting TypeScript 6 or 7 uses the
identical generics, conditional types, and `satisfies` from the previous step — nothing
about React typing changes. What changes is entirely in `tsconfig.json` defaults, how fast
feedback arrives, and which long-deprecated options finally stopped being merely
discouraged and started being errors.

## Further reading

- [Announcing TypeScript 6.0](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/)
- [Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- [A 10x Faster TypeScript](https://devblogs.microsoft.com/typescript/typescript-native-port/)
- [typescript-eslint docs](https://typescript-eslint.io/)
