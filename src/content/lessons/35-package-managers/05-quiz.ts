import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A CI pipeline runs `npm install` on every push, and a build that was passing yesterday starts failing today with no code changes and no `package.json` edit. What is the most likely cause, and what is the fix?',
      choices: [
        { id: 'a', text: 'CI runners are flaky; retry the job until it passes.' },
        {
          id: 'b',
          text: 'A transitive dependency published a new version inside an existing semver range, `install` resolved and quietly updated the lockfile to it, and the new version broke something; the fix is running `npm ci` in CI so installs reproduce the committed lockfile exactly instead of re-resolving.',
        },
        { id: 'c', text: 'npm install is deterministic, so this can only be an infrastructure problem, not a dependency problem.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A lockfile is a decision, but plain `install` will still update it to satisfy a `package.json` that drifted, or even to pick up a fresh in-range publish some registries allow. `npm ci` (and pnpm/Yarn\'s frozen/immutable equivalents) refuse to resolve anything new and fail loudly instead, which is why CI should never run plain `install`.',
    },
    {
      id: 'q2',
      prompt:
        "A library's source code does `import debounce from 'lodash.debounce'`, and it works in local development. In CI, on a clean checkout, the build fails with a module-not-found error for that exact import. The library's own `package.json` never lists `lodash.debounce` as a dependency. What's going on?",
      choices: [
        { id: 'a', text: "CI's Node version must be outdated." },
        {
          id: 'b',
          text: "It's a phantom dependency: locally, some other, unrelated dependency happened to pull in lodash.debounce and npm/Yarn's hoisting placed it at the top level of node_modules, where the import resolved by accident. CI's fresh install produced a different hoisting outcome, or a sibling change removed that transitive dependency, and the import that never should have worked stopped working.",
        },
        { id: 'c', text: 'lodash.debounce must have been unpublished from the registry.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "This is the textbook phantom-dependency bug: a hoisting layout that happens to make an undeclared package importable, until the tree shifts. pnpm's strict, non-hoisting layout makes this class of bug structurally impossible; npm and classic Yarn hoisting make it possible by design.",
    },
    {
      id: 'q3',
      prompt:
        'A plugin package declares `"react": "^18.0.0"` as a peer dependency, but the app installing it is on React 19. With `auto-install-peers` behavior in play, what actually happens on install?',
      choices: [
        {
          id: 'a',
          text: 'The peer dependency is silently ignored; peer dependencies never affect what gets installed.',
        },
        {
          id: 'b',
          text: "React 19 falls outside the plugin's declared ^18.0.0 peer range, so the mismatch gets surfaced rather than silently swallowed: depending on the tool, that's a warning, an install-time error, or (with auto-install-peers) a private nested copy of React 18 installed just for the plugin to satisfy its own declared range.",
        },
        { id: 'c', text: 'The install always fails hard with no way to proceed.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "A peer dependency is a compatibility claim, not a suggestion the installer can ignore. Auto-installing peers means the tool tries to satisfy the declared range automatically rather than requiring the consumer to install it by hand, but it cannot fabricate compatibility that doesn't exist — a genuinely out-of-range peer either gets its own nested copy or produces a warning/error surfacing the real mismatch, which is exactly the signal you want instead of a silent runtime bug from two React copies or a subtly incompatible one.",
    },
    {
      id: 'q4',
      prompt:
        "A team wants to add a dependency cooldown so a freshly-published, possibly-compromised package version can't land in an install the same day it's published. Which tool behavior, as of 2026, already does this by default without any extra configuration?",
      choices: [
        { id: 'a', text: 'npm, since npm has always blocked recently-published versions by default.' },
        {
          id: 'b',
          text: 'pnpm, which turned on a minimumReleaseAge default (1440 minutes, i.e. one day) starting with pnpm 11, specifically in response to 2026\'s spring supply-chain incidents.',
        },
        { id: 'c', text: 'Every package manager has always refused to install a version less than 24 hours old.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "pnpm 11 was the first of the major package managers to turn a minimum-release-age cooldown on by default, precisely because most malicious package versions get caught and pulled within hours — a one-day default cooldown filters out the fast-moving 'smash and grab' compromises without meaningfully slowing down legitimate updates.",
    },
    {
      id: 'q5',
      prompt:
        "A reviewer looks at a pull request that changes one line of application code and notices the lockfile diff touched forty transitive packages, several of which bumped a major version. What's the right response?",
      choices: [
        {
          id: 'a',
          text: 'Approve immediately — lockfile diffs are mechanical and not worth reading.',
        },
        {
          id: 'b',
          text: "Treat the size and shape of the diff as a real signal: ask why a one-line change produced that much movement (a stray full re-resolution? an accidental package.json range widened? a legitimate but unrelated bulk update that should have been its own PR), before approving.",
        },
        { id: 'c', text: 'Reject the PR outright; any lockfile change beyond the stated intent is automatically a bug.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "A lockfile diff that doesn't match the PR's stated intent is exactly the kind of thing code review exists to catch — not because it's necessarily wrong, but because an unexplained mismatch between the described change and the actual diff is where both accidental scope creep and supply-chain incidents hide. The response is to ask, not to reflexively approve or reflexively reject.",
    },
    {
      id: 'q6',
      prompt:
        "A team is about to publish their first public npm package. They add a `files` field listing only `dist/`, run `publint`, and it flags that their `exports` map points at a `.ts` source file instead of the built `.js`/`.d.ts` output. Why does this matter, and what class of tool caught it?",
      choices: [
        {
          id: 'a',
          text: "It doesn't matter — TypeScript source ships fine to any consumer.",
        },
        {
          id: 'b',
          text: 'It matters because a consumer\'s bundler or Node itself will try to resolve the path in `exports` at install/import time, and a `.ts` file that was never compiled (or excluded by `files`) will 404 or fail to parse for consumers without a TypeScript loader; `publint` is a package-shape linter built to catch exactly this kind of exports/files inconsistency before publish.',
        },
        { id: 'c', text: 'This is only a problem for CommonJS consumers, never for ESM consumers.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "`exports` is a promise about what a consumer's `import`/`require` will actually find, and `files` is what's actually in the published tarball to back that promise up. A mismatch between the two — often introduced by forgetting to point `exports` at build output — is invisible until a consumer's install breaks, which is exactly the gap tools like `publint` exist to close before publishing rather than after a bug report.",
    },
  ],
};
