# Why and how to monorepo

A monorepo is one repository holding multiple packages (apps, libraries, configs) that
are versioned, tested, and reviewed together. It is not "no repo boundaries" — the
packages are still separate units with their own `package.json`s; only the source
control and, usually, the toolchain are shared. The question is never "monorepo or not"
in the abstract, it's a trade you make deliberately.

## What it buys you

**Shared code without a publish step.** A design system, an API client, a set of shared
types — in a polyrepo these have to be published to a registry (public or private) and
bumped in every consumer before a fix lands. In a monorepo, a fix to `packages/ui` is
visible to every app that depends on it the instant you save the file, with no publish,
no version bump, no `npm link` hacks.

**Atomic cross-package changes.** Rename a function exported from a shared library and
update every call site across five apps in one commit, one PR, one CI run. In separate
repos that same rename becomes a coordination problem: bump the library, wait for CI to
publish it, then open five more PRs to consume the new version, each of which can drift
out of sync with the others in the meantime.

**One toolchain.** One TypeScript version, one Vite version, one ESLint/Biome config, one
CI pipeline definition. Upgrading React from 19.2 to 19.3 is one PR instead of N
PRs across N repositories, each possibly landing at a different time with a different
in-between state.

## What it costs you

None of this is free. **Build and CI time** grow with the repo, not with any one team's
slice of it, unless you invest in the caching and affected-detection tooling covered in
the next concept — a naive "run every test in the repo on every push" CI pipeline gets
slower every time anyone adds a package, including ones your team never touches.
**Ownership gets blurrier**: a `CODEOWNERS` file has to do the job that repo boundaries
used to do for free, and a bad change to a shared package can now break someone else's
app in the same PR that never touches their code directly. **The tooling itself is a new
cost**: pnpm workspaces, a task runner, shared configs, and a release tool are all things
someone has to set up and maintain that a polyrepo simply doesn't need.

## pnpm workspaces: the mechanics

A pnpm workspace is declared by a `pnpm-workspace.yaml` at the repo root:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - '!**/test-fixtures/**'
```

Every directory matching those globs that contains a `package.json` becomes a workspace
package, addressed by its `name` field, not its path. Run `pnpm install` once at the
root and pnpm resolves every package's dependencies together, symlinking workspace
packages into each other's `node_modules` instead of downloading them.

**The `workspace:` protocol** is how one workspace package depends on another:

```json
{ "dependencies": { "@acme/ui": "workspace:*" } }
```

- `workspace:*` — link to whatever the local package's current version is, no range
  checking. On `pnpm publish`, pnpm rewrites this to the exact current version of
  `@acme/ui` (e.g. `"1.4.2"`), because `*` carries no range semantics of its own to
  preserve.
- `workspace:^` / `workspace:~` — same local link, but on publish pnpm rewrites it to
  `^1.4.2` / `~1.4.2`, preserving the range semantics you asked for once the package is
  no longer sitting next to its dependency in a workspace.
- `workspace:1.2.3` (or `workspace:^1.2.3`) — an explicit version or range after the
  protocol. pnpm still resolves it locally during development (and errors if the local
  package's version doesn't satisfy it), but on publish it just drops the `workspace:`
  prefix and writes the literal string, since you already specified exactly what you
  wanted published.

This matters because a consumer who installs `@acme/ui` from the registry must never see
a `workspace:` specifier — npm and Node have no idea what to do with one. pnpm's publish
step is what makes the translation, and it's worth checking a package's published
`package.json` on npm at least once to confirm it actually happened.

**`catalog:`** solves a different problem: keeping the *same* version of an external
dependency (React, TypeScript, ESLint) consistent across every package, without hand
editing forty `package.json` files every time you bump it.

```yaml
# pnpm-workspace.yaml
catalog:
  react: ^19.3.0
  typescript: ^5.9.0
catalogs:
  react18:
    react: ^18.3.0
```

```json
{ "dependencies": { "react": "catalog:" } }
```

`catalog:` (bare) resolves against the default catalog; `catalog:react18` resolves
against a named one, useful when a handful of packages are deliberately pinned behind
the rest during a migration. Either way, bumping the version is a one-line edit to
`pnpm-workspace.yaml` instead of a find-and-replace across the repo, and — like
`workspace:` — pnpm rewrites `catalog:` to the literal resolved version on publish.

## Package boundaries: source or built?

An internal package can be consumed two ways, and the choice changes your dev loop:

**As TypeScript source**, via `"main": "./src/index.ts"` (or an `exports` map pointing at
`.ts` files directly). The consuming app's own bundler (Vite, in this course) compiles
the shared package's source as part of compiling the app. There is no build step for the
package itself, no dist output to go stale, and a change is visible on save. The cost:
every consumer's bundler has to be able to handle the shared package's source (TS,
JSX, whatever it uses), and this shape can never be published to npm as-is — a `.ts`
`main` 404s or fails to parse for an external consumer with no TypeScript loader.

**As built output**, via a real `build` script producing `dist/`, with `"main"`/`exports`
pointing there and `publishConfig` overriding those fields for what actually gets
published if the development-time fields differ:

```json
{
  "name": "@acme/ui",
  "main": "./src/index.ts",
  "publishConfig": { "main": "./dist/index.js", "types": "./dist/index.d.ts" }
}
```

This is the shape you need the moment a package is published externally, or needs its
own independent build (a native binding, a CSS extraction step) that a consumer's
bundler shouldn't have to redo on every change. Most internal-only packages should stay
source-consumed for as long as possible — it's strictly less machinery — and only grow a
real build step when something (external publishing, a non-JS build artifact) forces it.

## Shared configuration and project references

The other half of "one toolchain" is making it *installable*, not just agreed-upon:

- A `tsconfig/base.json` package that every app and library `extends`, so a stricter flag
  (or a new one TypeScript 7 ships) is a one-line bump instead of forty edits.
- An ESLint flat config or Biome config package, same reasoning — see the linters lesson
  for how Biome and oxlint fit into this.
- A Tailwind preset package so design tokens live in one place and every app's config is
  three lines: import the preset, extend it, done.

**TypeScript project references** (`"references": [{ "path": "../ui" }]` plus
`"composite": true` in the referenced package) let `tsc --build` compile only the
packages that changed and their dependents, incrementally, using `.tsbuildinfo` files as
a cache — the same "only redo what changed" idea the next concept applies to whole
package builds, just scoped to the type checker.

## Further reading

- [pnpm workspaces](https://pnpm.io/workspaces)
- [pnpm: the workspace protocol](https://pnpm.io/workspaces#workspace-protocol-workspace)
- [pnpm: catalogs](https://pnpm.io/catalogs)
- [TypeScript: project references](https://www.typescriptlang.org/docs/handbook/project-references.html)
