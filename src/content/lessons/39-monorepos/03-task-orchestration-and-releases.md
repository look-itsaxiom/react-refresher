# Task orchestration and releases

Workspaces solve where code lives. A **task runner** — Turborepo, Nx, or plain pnpm —
solves a different problem: given forty packages, which tasks actually need to run for
this change, in what order, and can any of them be skipped because they already ran on
this exact input before.

## Task graphs

A task isn't just "run `build` in every package" — `build` in one package usually
depends on `build` having already finished in the packages it imports from. Turborepo's
`turbo.json` expresses that with `dependsOn`:

```json
{
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "test": { "dependsOn": ["build"] },
    "lint": {}
  }
}
```

`^build` means "the `build` task in every package this package depends on" — a
workspace-graph-relative reference, not a literal task name. Plain `build` (no `^`) means
"the same task, in this same package" (useful for a `codegen` step that must finish
before `build` in the same package). Nx expresses the identical idea with
`targetDefaults` and `dependsOn: ["^build"]` in `nx.json` — the syntax differs, the graph
underneath is the same: a DAG of `(package, task)` nodes, topologically ordered, with
independent branches run in parallel.

## Caching by input hash, not by "did this run before"

Both tools hash every input a task can observe — source files matched by that task's
`inputs`, the resolved versions of its dependencies, relevant environment variables, the
task's own command — into one cache key. If that exact hash ran before, the task is
skipped entirely and its stdout and declared `outputs` are replayed from cache instead.
This is why a task's `outputs` declaration matters: an output directory you forgot to
list never gets cached or restored, and a *stale* one from a previous run can silently
survive a "cache hit" that only replayed logs, not files, if the tool doesn't clean
first.

**Remote caching** shares that cache across machines: your teammate's build, or last
night's CI run, satisfies your local build if the input hash matches, so `pnpm install &&
turbo build` on a fresh CI runner can come back in seconds instead of minutes when
nothing relevant changed. Turborepo defaults to Vercel's remote cache with zero config
and also supports a self-hosted cache server over the same open API; Nx offers Nx Cloud
on the same principle. The failure mode to watch for is a misconfigured `inputs` or
untracked environment variable: a cache key that doesn't actually capture everything the
task depends on produces a cache *hit* for a build that should have been a *miss*, which
looks like "the build works locally and is broken in prod" — the worst kind of caching
bug because the tool reports success.

## Env var hashing pitfalls

An env var that changes a build's output (a feature flag, an API base URL) has to be
declared to the task runner or it's invisible to the hash — the build gets cached under
the same key regardless of the env var's value, and a change to a `.env` that nothing
declared silently serves a stale artifact built for the wrong environment. Turborepo
requires you to list env vars a task depends on under `env`/`globalEnv` (or opt into
strict mode, which errors on undeclared env var access instead of silently passing
everything through); Nx has the equivalent under `namedInputs`. Either way, "the cache is
wrong" is almost always "an input wasn't declared," not a bug in the hashing itself.

## Affected-only CI

Running every task in every package on every push doesn't scale, so both tools compute
an **affected set**: given a base ref (usually the last commit on `main`), diff the
changed files, map them to the packages that own them, then walk the dependency graph
*forward* to every package that depends on one of those — because a dependent's behavior
can change even though none of its own files did. pnpm's `--filter` syntax is worth
knowing on its own, since Turborepo reuses it:

- `--filter=ui` — just that package.
- `--filter=ui...` — `ui` and everything **it depends on** (its own subgraph, downward).
- `--filter=...ui` — `ui` and everything **that depends on it** (upward, its dependents).
- `--filter=...[origin/main]` — every package affected by a diff against `origin/main`
  (changed packages plus their dependents), the shape a CI job actually wants.

Turborepo's `--filter` accepts the same syntax; Nx's equivalent is `nx affected
--base=origin/main` computing the same forward-closure over its own project graph. A CI
pipeline built on either should run tasks scoped to the affected set, not the whole repo
— the entire value proposition of the tool evaporates if every push still runs
everything.

## Turborepo vs Nx vs plain pnpm

**Plain `pnpm -r` / `pnpm --filter`** needs no extra tool: `pnpm -r build` runs `build` in
every package in topological order (pnpm computes that from the `workspace:`
dependencies automatically), and `--filter` scopes it. It has no caching and no
parallelism-aware scheduling beyond respecting the dependency order — fine for a small
workspace, and always available as the fallback with zero setup.

**Turborepo** adds the task graph, content-addressed local and remote caching, and
`--filter`-based affected scoping on top, with a small `turbo.json` and (since its Rust
rewrite) fast graph computation and file hashing even on large repos. It intentionally
does less than Nx: no generators, no built-in project-boundary enforcement, no plugin
ecosystem — it orchestrates tasks and caches them, and that's close to the whole feature
set.

**Nx** does everything Turborepo does and layers more on top: code generators
(`nx g @nx/react:component`), enforced module boundaries between packages via tags (a
`feature` package can be barred from importing a `feature` package in a different domain
at lint time), a visual dependency graph explorer, and a large plugin ecosystem for
specific frameworks. That power comes with more configuration surface and a steeper
learning curve; teams that only want "cache my builds and only test what changed" often
find Turborepo sufficient, while teams that want the monorepo tool to also enforce
architecture reach for Nx.

**Lerna**, historically the first mainstream JS monorepo tool, is now maintained by the
Nx team and in practice delegates task running and affected-graph detection to Nx under
the hood — in 2026 it's positioned purely as a versioning/publishing companion (including
OIDC trusted publishing to npm, avoiding long-lived tokens in CI), not a competitor to
Turborepo or Nx for build orchestration. **Bun** ships its own workspaces (`workspaces` in
the root `package.json`, no separate config file) with fast installs but no built-in task
graph or caching — teams on Bun workspaces still reach for Turborepo or Nx on top for
that. **moon** and **Rush** are smaller players solving the same task-graph-plus-caching
problem with their own config shape; worth knowing they exist, not essential to learn
here.

## Versioning and changelogs with Changesets

A monorepo with multiple *publishable* packages still needs a release process, and
"bump every package's version by hand and write the changelog by hand" doesn't scale any
better than running every test on every push does. **Changesets** decouples "describe
the change" from "compute the release": a contributor runs `pnpm changeset` alongside
their PR, answers which packages changed and how (`patch`/`minor`/`major`), and that
gets committed as a small markdown file in `.changeset/`. A release job later runs
`changeset version`, which consumes every pending changeset file, bumps each named
package, **and bumps any package that depends on a bumped package** by at least a patch
— `updateInternalDependencies`, on by default — because a dependency's version changing
is itself a change to the dependent's `package.json`, then writes a `CHANGELOG.md` entry
per package from the changeset descriptions.

Two versioning strategies matter: **independent** (the default — each package gets its
own version, moving only when it or something it depends on changed) versus **fixed**
(every package in a fixed group bumps to the same version together, even ones with no
changes at all — the shape big frameworks with lockstep releases use) with **linked** as
a middle ground (versions move together only when at least one linked package actually
has a changeset). Most workspaces of genuinely independent libraries want independent;
reach for fixed only when the packages are conceptually one product released together.

## When not to monorepo

None of this is required to get the *code-sharing* benefit — a monorepo without any task
runner, just pnpm workspaces and `pnpm -r`, is a completely valid and common setup for a
handful of packages. Skip the tooling investment (Turborepo/Nx, Changesets, remote
caching) when: the repo is small enough that "just run everything" finishes in seconds;
there's exactly one publishable package, so there's no cross-package release
choreography to automate; or the team is one or two people, where the coordination
problems this tooling solves — CI cost at scale, unclear ownership, many contributors
touching shared code — mostly don't exist yet. Adding Nx to a three-package repo with one
contributor is pure overhead; the tooling earns its complexity once the package count,
contributor count, or CI bill actually hurts.

## Further reading

- [Turborepo: configuring tasks](https://turborepo.dev/docs/crafting-your-repository/configuring-tasks)
- [Turborepo: caching](https://turborepo.dev/docs/crafting-your-repository/caching)
- [Nx: affected commands](https://nx.dev/features/run-tasks#run-tasks-affected-by-a-pr)
- [Changesets: intro](https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md)
