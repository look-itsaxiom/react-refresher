# Choosing and operating one in 2026

Picking a package manager used to be mostly aesthetic. In 2026 it's a real decision with
real consequences for install speed, disk usage, correctness, and how exposed you are to
supply-chain risk.

## The default for new projects: pnpm

This repo pins `"packageManager": "pnpm@10.32.1"` in `package.json`, and that's the
right default for most new JavaScript/TypeScript projects in 2026, for three concrete
reasons covered in the last lesson: its content-addressable store makes installs fast
and disk-cheap across every project on the machine (not just this one), its strict
symlinked layout makes phantom dependencies structurally impossible, and it turns on
supply-chain protections like `minimumReleaseAge` by default. pnpm 12, released August
2026, rewrote the CLI's core from TypeScript to Rust — repeat installs now resolve in
the low tens of milliseconds — while deliberately keeping pnpm 11's commands, flags,
`pnpm-lock.yaml` format, and `node_modules` layout unchanged, so upgrading is a version
bump, not a migration.

**npm** is still the right call when you want the tool that's simply *there*, with zero
setup, on every machine that has Node installed at all — a quick script, a workshop
repo, a library so small that install speed never matters. Its `node_modules` are
classic-hoisted, so phantom dependencies remain possible, and multi-project disk usage
is worse than pnpm's, but for a single small project neither cost bites.

**Yarn**'s niche has narrowed. Yarn Classic (v1) is legacy at this point. Yarn Berry
(v4.x) is a real, maintained tool, and its Plug'n'Play mode is still the strongest
phantom-dependency guarantee available (there's no `node_modules` to accidentally
resolve through) — but PnP support gaps in some bundlers, editor tooling, and
less-maintained packages mean most Yarn 4 users run it in `node-modules` linker mode
anyway, at which point it's competing directly with pnpm on the same axis pnpm already
wins. Teams already invested in Yarn workspaces and its constraints/`resolutions`
tooling have little reason to migrate; teams starting fresh have little reason to start
there.

**Bun** is a runtime *and* a package manager (`bun install`), and its install speed is
real — it resolves and links against a global cache the same way pnpm does, skipping
most of Node's module-resolution overhead by not being Node. Since Bun 1.2 its default
lockfile is the text-based, diffable `bun.lock` (replacing the earlier binary
`bun.lockb`), which fixed the biggest practical objection to using it: you can now
actually review a Bun lockfile diff in a pull request. The tradeoff is ecosystem
maturity — some npm lifecycle-script edge cases and native-binary packages still behave
slightly differently under Bun than under Node, so "Bun as your package manager, Node as
your runtime" is a more common combination than "Bun as both," today.

## Workspaces, briefly

All four tools support a **workspace**: multiple packages in one repository, one
lockfile, with cross-package dependencies resolved by symlinking a workspace member
into the others' `node_modules` instead of downloading it. `pnpm-workspace.yaml` (or a
`workspaces` array in `package.json` for npm/Yarn/Bun) lists which directories are
members. That's the whole primitive — [[Monorepos]] is where the harder problems
(task orchestration, remote caching, versioning many packages together) get covered;
this lesson stops at "workspaces let one install cover several packages."

## `packageManager` and Corepack

The `packageManager` field (`"pnpm@10.32.1"`) pins the exact tool *and version* a
project expects, and **Corepack** — shipped with Node since 14.19 — reads that field
and transparently shims `pnpm`/`yarn`/`npm` to run the pinned version, so nobody on a
team needs pnpm globally installed at the right version to get a consistent install.
Corepack's own status is in flux: Node's Technical Steering Committee voted in 2026 to
stop bundling it starting with Node 25, after which it'll need to be installed
separately (`npm install -g corepack`) rather than assumed. It remains available and
bundled in Node 24 and earlier for now.

## Updating dependencies without breaking things

`pnpm outdated` (or `npm outdated`) lists what's behind, split by whether a bump stays
inside the declared range (safe under semver, if the package follows semver correctly)
or crosses a major. `pnpm update -i` (interactive) is the manual, one-at-a-time way to
work through that list with a build/test cycle between bumps rather than updating
everything and debugging the result as one undifferentiated blob.

At scale, that manual process doesn't cover enough ground, which is why most teams run
**Renovate** or **Dependabot**: both open one pull request per dependency (or per
logical group) on a schedule, complete with the changelog diff, so review and CI catch
regressions before merge rather than after. Both tools also now support a *release
cooldown* setting that mirrors `minimumReleaseAge` at the update-automation layer — don't
even open the PR for a version younger than N hours.

## Reviewing a lockfile diff in a PR

A lockfile diff is a real part of a change, not a mechanical side effect to skim past.
Three things are worth a second look every time: did a *major* version bump sneak in
under a dependency you didn't touch directly (a transitive package publishing outside
its declared range, or an `overrides` entry doing more than intended); did the number of
distinct versions of one package *increase* (a sign a new dependency introduced a
duplicate copy that dedup didn't catch); and does the diff match what the PR's stated
intent would produce (a one-line feature change touching forty transitive packages is
worth asking about before approving).

## Publishing basics

Three controls decide what actually ships in your published tarball. `files` (or the
inverse, `.npmignore`) is an allowlist — without one, npm publishes everything not
`.gitignore`d, including test fixtures and internal scripts nobody outside your repo
needs. `exports` is the map from what consumers `import` to your real file layout, and
is the mechanism [[Modules and import maps]] (lesson 33) covers in depth for dual
CJS/ESM packages — this lesson only needs you to know it's the field that matters.
`publint` (`npx publint`) is a linter for exactly this surface: it checks that your
`exports` map, `main`/`types`, and `files` allowlist are internally consistent before
you find out from a downstream bug report instead. Provenance (`npm publish --provenance`,
now the default on GitHub Actions publishes via OIDC) attaches a signed, verifiable
statement of which CI run and commit produced the published tarball — visible to
consumers as a checkmark on the npm registry page, though neither Yarn nor Bun verify it
on install yet, so it's a producer-side guarantee more than an enforced one.

## Further reading

- [pnpm workspaces](https://pnpm.io/workspaces)
- [pnpm 12.0 release notes](https://pnpm.io/blog/releases/12.0)
- [Bun: Lockfile](https://bun.com/docs/pm/lockfile)
- [npm docs: Generating provenance statements](https://docs.npmjs.com/generating-provenance-statements/)
