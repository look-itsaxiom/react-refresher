import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A three-package repo with one contributor is considering adding Nx: generators, caching, affected-graph detection, module-boundary enforcement, the works. What should they actually do?',
      choices: [
        { id: 'a', text: 'Add Nx now — more tooling is always safer for a repo that might grow later.' },
        {
          id: 'b',
          text: "Skip it for now. pnpm workspaces plus `pnpm -r` already gives the code-sharing benefit; a task runner earns its configuration cost once package count, contributor count, or CI time actually hurts, and none of those pressures exist yet in a three-package, one-contributor repo.",
        },
        { id: 'c', text: 'Adding Nx is required the moment a repo has more than one package, regardless of size.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Monorepo tooling (Turborepo, Nx, Changesets, remote caching) is a cost you take on to solve specific pains — slow CI at scale, unclear ownership across many contributors, release choreography across many publishable packages. A tiny repo with one contributor doesn't have those pains, so the tooling is pure overhead until it does.",
    },
    {
      id: 'q2',
      prompt:
        "A library package publishes with `\"dependencies\": { \"@acme/ui\": \"workspace:*\" }` still in its published package.json on npm. What went wrong, and what should have happened?",
      choices: [
        { id: 'a', text: "Nothing — npm understands the workspace: protocol natively." },
        {
          id: 'b',
          text: "This is a broken publish: `workspace:*` has no meaning to npm or Node outside the monorepo it was written in. `pnpm publish` is supposed to rewrite it to the exact local version of `@acme/ui` before the tarball is uploaded; either the wrong publish command ran, or something bypassed pnpm's rewrite step.",
        },
        { id: 'c', text: "It's fine as long as the consumer also happens to be using pnpm." },
      ],
      correctChoiceId: 'b',
      explanation:
        "The workspace: protocol is purely a local-development convenience. pnpm's publish step is the only thing that translates it into something an external registry consumer's package manager can actually resolve — a `workspace:*` that survives into a published package.json means that translation never ran.",
    },
    {
      id: 'q3',
      prompt:
        'CI reports a Turborepo cache hit for `build` on a PR that changed a feature flag read from `process.env.FEATURE_X` at build time, and the deployed build behaves as if the flag were still off. What is the most likely root cause?',
      choices: [
        { id: 'a', text: 'Turborepo caching is unreliable and should be disabled.' },
        {
          id: 'b',
          text: "FEATURE_X was never declared to Turborepo (in `env`/`globalEnv`), so it never entered the task's input hash. The hash matched a previous run built with the flag off, the cached artifact was replayed, and the tool reported success because nothing it was told to check actually changed.",
        },
        { id: 'c', text: 'The remote cache server must be down.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "A cache is only as correct as its declared inputs. An env var that changes build output but isn't declared is invisible to the hash, so a real behavioral change can still produce a cache hit — the classic 'works locally, wrong in prod' bug, and the fix is always to audit which inputs a task actually reads, not to distrust caching in general.",
    },
    {
      id: 'q4',
      prompt:
        "A reviewer sees a PR add `\"main\": \"./dist/index.js\"` with a real `build` script to an internal-only package that every consumer in the same monorepo currently imports as TypeScript source, and no external publish is planned. Is this change justified?",
      choices: [
        {
          id: 'a',
          text: 'Yes, every shared package should have a build step for consistency, regardless of whether anything needs it.',
        },
        {
          id: 'b',
          text: "Probably not yet. Source-consumed internal packages (`\"main\": \"./src/index.ts\"`) are strictly less machinery — no build step to keep in sync, no dist to go stale, changes visible on save — and that shape stays valid as long as consumers only exist inside the same monorepo. A build step earns its cost when external publishing or a genuinely separate build artifact forces it, not by default.",
        },
        { id: 'c', text: "No, internal packages must never have a build script under any circumstances." },
      ],
      correctChoiceId: 'b',
      explanation:
        "The source-vs-built choice is a real trade, not a style preference: source consumption removes a whole class of staleness and setup cost, and should be the default for internal-only packages. The question worth asking in review is what problem the build step is being added to solve — if the answer is 'nothing yet,' it's premature.",
    },
    {
      id: 'q5',
      prompt:
        'A team runs Changesets with the default `updateInternalDependencies` behavior. Package `db` gets a `major` changeset, and package `api` internally depends on `db` via `workspace:*` but has no changeset of its own. What happens to `api`\'s version?',
      choices: [
        { id: 'a', text: "Nothing — a changeset only affects the package it's written against." },
        {
          id: 'b',
          text: "`api` gets at least a patch bump, because `db`'s version changing is itself a change to `api`'s package.json (its `workspace:*` dependency now resolves differently on publish) — Changesets treats that as something worth a changelog entry and a version bump, even though `api`'s own source didn't change.",
        },
        { id: 'c', text: "`api` is forced to the same major version as `db`, since they're in the same monorepo." },
      ],
      correctChoiceId: 'b',
      explanation:
        "`updateInternalDependencies` (on by default) is exactly this rule: a dependent's manifest changed even if its code didn't, so it gets at least a patch bump and a changelog line noting the internal dependency update. It does not force lockstep versioning — that's what `fixed` groups are for, and they're a separate, opt-in decision.",
    },
    {
      id: 'q6',
      prompt:
        'A team maintains ten independently-versioned publishable packages with Changesets, and a senior engineer proposes switching the whole workspace to `fixed` versioning "to keep things simple." What is the tradeoff they are not accounting for?',
      choices: [
        {
          id: 'a',
          text: "There is no tradeoff — fixed versioning is strictly simpler and has no downside.",
        },
        {
          id: 'b',
          text: 'Fixed versioning bumps every package in the group to the same new version on every release, including packages with zero actual changes — which is the right call for a lockstep product but produces a wall of no-op version bumps and changelog noise for genuinely independent libraries that don\'t need to move together.',
        },
        { id: 'c', text: 'Fixed versioning is only a display setting and does not change what gets published.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Fixed (and its softer cousin, linked) trade independence for a single coherent version number across a group — the right call when the packages are conceptually one product. Applied to genuinely independent libraries, it forces every package to publish a new version on every release regardless of whether it changed, which is exactly the noise independent versioning exists to avoid.",
    },
  ],
};
