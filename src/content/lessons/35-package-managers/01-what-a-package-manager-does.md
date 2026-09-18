# What a package manager actually does

You've typed `npm install` thousands of times. Underneath, a package manager is solving
one hard problem (dependency resolution) and one boring-but-critical problem (laying
files out on disk so `import` finds them) — and in 2026, increasingly, a third: deciding
whether to trust what it's about to run.

## Resolution: ranges in, a lockfile out

`package.json` doesn't pin versions, it pins **ranges**: `"react": "^19.3.0"` means "any
19.x.y where the tuple is `>= 19.3.0`". When you (or corepack) run an install, the
resolver walks your whole dependency graph — your deps, their deps, their deps' deps —
and picks one concrete version per range that satisfies every constraint simultaneously.
That's a constraint-satisfaction problem, and it's why two installs run months apart, on
the same `package.json`, can legitimately produce different trees: new versions get
published inside the same range.

The lockfile (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`) exists so
that *doesn't* happen. It's not a cache or a suggestion — it's the resolver's decision,
written down: exact versions, exact integrity hashes, exact places in the tree. Once a
lockfile exists, every subsequent install is supposed to reproduce it exactly, range
satisfaction be damned.

This is why `npm ci` (and pnpm's `--frozen-lockfile`, Yarn's `--immutable`) exist as
separate commands from `install`. `install` will happily *update* the lockfile to
satisfy a `package.json` that has drifted from it. `ci`/`--frozen-lockfile` refuse: if
the lockfile and `package.json` disagree, the install fails instead of silently
resolving something new. CI pipelines should never run plain `install` for exactly this
reason — a flaky, unreviewed dependency bump shouldn't be able to sneak into a build
just because a transitive package happened to publish overnight.

## Where the files actually go

Resolution answers "which version." Layout answers "where does `require('lodash')` find
it," and the three major tools answer that differently.

**npm and (classic) Yarn hoist.** To avoid ten copies of the same version of `lodash`
nested ten directories deep, both flatten the tree: if every consumer can agree on one
version, it gets pulled up to the top-level `node_modules/`. This is efficient, but it
creates a well-known trap called a **phantom dependency**: because Node's module
resolution walks *up* the directory tree looking for a package, your code can
successfully `import` something that was hoisted next to it but that you never listed in
your own `package.json`. It works today. It breaks the day a sibling package drops that
dependency or the hoisting outcome shifts, and nothing in your own manifest predicted it.

**pnpm never hoists into a shared, flat `node_modules`.** Every package version is
stored once, content-addressed, in a global store on disk. Each project's
`node_modules/.pnpm/<name>@<version>/node_modules/` gets *symlinks* back into that store
— and a package only gets a symlink to the dependencies it actually declared. The
top-level `node_modules/<name>` entries you can `import` from your own code are exactly
your own direct dependencies, symlinked in. Phantom dependencies become structurally
impossible: there's no hoisted flat layer to accidentally resolve through. This is the
concrete reason pnpm installs are fast (the store is a cache across *every* project on
the machine, not just this one) and correct (what resolves at runtime matches what's
declared).

**Yarn Berry's Plug'n'Play (PnP) goes further and skips `node_modules` entirely.**
Packages stay zipped in `.yarn/cache`, and a generated `.pnp.cjs` file maps every import
specifier straight to an offset inside a zip. There's nothing to hoist and no
`node_modules` to walk, so installs after the first are close to instant and phantom
access is impossible by construction — but some older loaders, bundlers, and editor
tooling need explicit PnP support to work, which is why PnP stayed opt-in and most Yarn
users in practice run `nodeLinker: node-modules` instead.

## Peers, overrides, and optional platform packages

A **peer dependency** says "I expect a compatible copy of this to already exist in the
tree, don't install me a private one" — the standard shape for plugins (an ESLint
plugin peer-depending on `eslint`, a React component library peer-depending on `react`).
Historically peer dependencies had to be installed by hand; npm 7+ and pnpm now
auto-install them when there's no conflict. This repo's `.npmrc` sets
`auto-install-peers=true` for exactly that reason — check it and you'll find it's the
only line in the file.

Sometimes you need to force a specific version deep inside someone else's dependency
tree — a transitive package with a known vulnerability, before upstream ships a fix.
npm's `overrides` field, Yarn's `resolutions`, and pnpm's `pnpm.overrides` all do this:
they let `package.json` reach past your direct dependencies and pin a version anywhere
in the graph.

And `optionalDependencies` is how tools like esbuild and SWC ship native binaries: they
publish one tiny package per OS/architecture combination, list them all as optional
peers of the main package, and the installer only actually downloads the one matching
the current platform, silently skipping (not failing on) the rest.

## Lifecycle scripts, and why they became a security question

`postinstall` (and `preinstall`, `prepare`) scripts run arbitrary shell/JS the moment a
package lands in your tree — historically used to compile native bindings, but also the
single most common vector in the supply-chain compromises that hit the npm ecosystem in
spring 2026 (Trivy, LiteLLM, and axios packages were all hit via compromised versions
that ran malicious install-time code). `--ignore-scripts` disables all of them; pnpm
goes further by default, refusing to *run* build scripts for anything not explicitly
listed in `pnpm.onlyBuiltDependencies`, so a newly-added transitive dependency doesn't
get to execute code on install just by existing in the tree.

The other lever is time: most malicious package versions get detected and pulled within
hours of publishing. A **minimum release age** (a "cooldown") simply refuses to install
any version younger than that window, which is why pnpm 11 turned it on by default (1440
minutes — one day) and npm's CLI is following the same pattern.

## Caching in CI

CI runners are ephemeral, so every job re-runs the resolution-and-layout work unless you
cache it. The right cache key is a hash of the lockfile, not of `node_modules` itself
(the store/`node_modules` layout can be platform-specific in ways the lockfile isn't),
and the right install command is always the frozen variant — `npm ci`,
`pnpm install --frozen-lockfile`, `yarn install --immutable` — so a cache miss can't
quietly turn into a fresh, unreviewed resolution.

## Further reading

- [npm docs: package-lock.json](https://docs.npmjs.com/cli/v12/configuring-npm/package-lock-json)
- [pnpm: how peers are met](https://pnpm.io/how-peers-are-met)
- [pnpm: Symlinked node_modules structure](https://pnpm.io/symlinked-node-modules-structure)
- [Yarn: Plug'n'Play](https://yarnpkg.com/features/pnp)
