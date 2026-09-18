import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A team wants `no-floating-promises` (an async call whose result is neither awaited nor otherwise handled) enforced on every commit, and picks Biome to run it because Biome is fast. Biome ships this rule without needing `tsc` or a `typescript` install at all. Is that surprising for a type-aware rule?',
      choices: [
        { id: 'a', text: "Yes — type-aware rules are impossible without a full ts.Program, so this must actually be a syntactic check in disguise." },
        {
          id: 'b',
          text: "No — Biome ships its own lightweight type-inference engine (sponsored by Vercel) that infers just enough type information to answer specific questions like \"does this call return a Promise\", without claiming to be a full type checker the way tsc is.",
        },
        { id: 'c', text: "No — Biome silently shells out to tsc in the background whenever a type-aware rule is enabled, it just hides the cost." },
      ],
      correctChoiceId: 'b',
      explanation:
        "Full type checking (tsc, or typescript-eslint's type-aware preset) and type inference for specific rule questions are different amounts of work. Biome's engine answers narrow questions like a call's return type without building or maintaining a complete, sound type system — fast enough to run on every commit, at the cost of not being a substitute for tsc.",
    },
    {
      id: 'q2',
      prompt:
        "A repo on TypeScript 7 tries to add typescript-eslint's type-aware rules and `pnpm install` fails with an ERESOLVE peer dependency conflict on `typescript`. What's the actual cause, and what are the realistic options?",
      choices: [
        { id: 'a', text: 'typescript-eslint is abandoned; the only fix is to switch the whole project off TypeScript 7 permanently.' },
        {
          id: 'b',
          text: "TypeScript 7.0 shipped without a public programmatic compiler API, which typescript-eslint's type-aware rules are built on, so its peer range caps below TS 7; realistic options are pinning TypeScript 6.x (or a compatibility shim) just for ESLint's type-aware pass, waiting for TS 7.1's API and a matching typescript-eslint release, or using oxlint's tsgolint, which builds directly on typescript-go and isn't blocked by the missing API.",
        },
        { id: 'c', text: 'This only happens with a corrupted lockfile; deleting node_modules and reinstalling resolves it every time.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "The peer conflict reflects a real, temporary gap: TypeScript 7.0 (GA July 2026) removed the public compiler API that typescript-eslint's type-aware rules depend on, with the API's return targeted for TypeScript 7.1. Until a compatible typescript-eslint ships, teams either dual-pin TypeScript versions for lint vs. build, or move type-aware linting to a tool (oxlint + tsgolint) that was never depending on that API.",
    },
    {
      id: 'q3',
      prompt:
        'A reviewer asks why a project runs its type-aware ESLint rules only in CI and a pre-push hook, never in the pre-commit hook that also runs the formatter and syntactic lint rules on every commit. Is that inconsistent?',
      choices: [
        { id: 'a', text: "Yes — every check the project has should run at every checkpoint, otherwise bugs slip through between commit and push." },
        {
          id: 'b',
          text: "No — type-aware rules require building a full type-checker program over files the change touches (and often files it doesn't), which is 5-10x slower than syntactic checks; gating the expensive pass to pre-push or CI keeps every commit fast while still blocking a merge on the same rules.",
        },
        { id: 'c', text: "No — type-aware rules can only run in CI, never locally, for licensing reasons." },
      ],
      correctChoiceId: 'b',
      explanation:
        "This is a deliberate cost trade-off, not an oversight. Formatting and syntactic lint rules are near-instant, so they belong on every commit. Type-aware rules need a full program build and are correspondingly slower — running them on every commit is the most common reason a team ends up disabling their hooks altogether, so pushing that cost to pre-push or CI (where it still gates a merge) keeps the fast path fast.",
    },
    {
      id: 'q4',
      prompt:
        'A legacy codebase has roughly 4,000 existing ESLint violations across a rule set the team wants to newly enforce. What does adopting a "baseline" (a suppression snapshot of current violations) actually buy the team, compared to either fixing everything up front or just not enabling the rules?',
      choices: [
        { id: 'a', text: "It permanently exempts every one of those 4,000 lines from ever being checked again, even after they're edited." },
        {
          id: 'b',
          text: "It lets the rule set be enforced starting now — any new violation fails CI immediately — without a multi-week fix-everything-first blocker, while the 4,000 existing violations stay visible as tracked debt to pay down deliberately rather than either ignored forever or used as an excuse not to adopt the rules at all.",
        },
        { id: 'c', text: "It automatically fixes all 4,000 violations using the linter's autofixer, whether or not a safe fix exists." },
      ],
      correctChoiceId: 'b',
      explanation:
        "A baseline snapshots today's violations so the linter only fails on anything new, which is what makes incremental adoption realistic in a large legacy codebase. It's not a permanent exemption — the snapshot is a to-do list, and a normal workflow either shrinks it file-by-file or requires a touched file to clear its own entries before merging.",
    },
    {
      id: 'q5',
      prompt:
        "A component calls `useSubscription()` conditionally — inside `if (flag) { useSubscription(); }` — and passes `react-hooks/exhaustive-deps` cleanly because there's no dependency array involved. A teammate argues this is fine since no lint rule flagged it. What's actually wrong?",
      choices: [
        { id: 'a', text: "Nothing — exhaustive-deps is the rule that governs hook usage, and it passed, so the code is safe." },
        {
          id: 'b',
          text: "This should be caught by a different rule, react-hooks/rules-of-hooks, which specifically checks that a hook call is never inside a condition, loop, or after an early return — exhaustive-deps only checks dependency arrays and has no opinion on whether the call itself is conditionally reached.",
        },
        { id: 'c', text: "Nothing is wrong; hooks are only required to run unconditionally inside class components, not function components." },
      ],
      correctChoiceId: 'b',
      explanation:
        "rules-of-hooks and exhaustive-deps check different things: rules-of-hooks enforces that React can rely on the same hooks running in the same order every render (the actual mechanism this lesson's first exercise implements), while exhaustive-deps only checks that a dependency array lists everything a callback/effect closes over. A conditional hook call breaks React's per-render bookkeeping regardless of whether any dependency array is involved.",
    },
    {
      id: 'q6',
      prompt:
        "A project adds `eslint-plugin-jsx-a11y` and is surprised it flags a `<div onClick={handleSelect}>` used as a custom dropdown option, even though the code has no TypeScript errors and all its tests pass. Why would a passing type-checker and a passing test suite both miss this?",
      choices: [
        { id: 'a', text: "They wouldn't — if tsc and the tests both pass, the accessibility rule must be a false positive." },
        {
          id: 'b',
          text: "A clickable, non-semantic element is valid TypeScript and valid JSX, and a test written with the same assumptions (e.g. clicking the div directly) would pass too — jsx-a11y rules check a different property entirely: whether the markup exposes the right role, keyboard interaction, and focus behavior to assistive technology, which type-correctness and behavioral tests as usually written don't verify at all.",
        },
        { id: 'c', text: "This only happens when the project's tsconfig has strict mode disabled." },
      ],
      correctChoiceId: 'b',
      explanation:
        "Type checking verifies shapes and tests verify the behavior someone thought to assert — neither is aimed at whether a `<div>` used as an interactive control has a role, is keyboard-reachable, or announces itself to a screen reader. jsx-a11y exists precisely because that class of bug is invisible to both, which is also why it belongs in the lint layer rather than being treated as something type safety or coverage numbers already guarantee.",
    },
  ],
};
