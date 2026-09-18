import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt: 'A component mutates a prop array in place with `.sort()` before rendering it. What does React Compiler do with that component?',
      choices: [
        { id: 'a', text: 'It throws a build error, because mutating props is now forbidden syntax.' },
        { id: 'b', text: 'It silently skips (bails out on) memoizing that component, leaving the code to run exactly as written.' },
        { id: 'c', text: 'It automatically rewrites `.sort()` to a non-mutating copy for you.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The compiler bails out silently by default when it detects (or cannot rule out) a Rules-of-React violation — you get your original, unmemoized code, not an error and not a rewrite. That silence is exactly why running `eslint-plugin-react-hooks`\' compiler rules matters: they surface the same violations at lint time, with a message.',
    },
    {
      id: 'q2',
      prompt:
        'In compiled output you see `const $ = _c(4);` followed by `if ($[0] !== products || $[1] !== query) { ... }`. What is `$`?',
      choices: [
        { id: 'a', text: 'A reference to the component\'s props object.' },
        { id: 'b', text: 'A per-fiber memo cache array with one slot per value or JSX subtree the compiler chose to memoize, compared against this render\'s inputs.' },
        { id: 'c', text: 'A global cache shared across every instance of the component.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The memo cache is scoped to that component instance (its fiber), not global and not the props object. Each slot corresponds to one computation the compiler decided to cache; the `!==` checks are the compiler doing, by hand in generated code, what `useMemo`\'s dependency array does manually — except computed automatically and at finer granularity.',
    },
    {
      id: 'q3',
      prompt: 'What is the difference between the `"use no memo"` and `"use memo"` directives?',
      choices: [
        { id: 'a', text: '"use no memo" tells the compiler to skip a specific function; "use memo" opts a specific function in, which only matters under `compilationMode: \'annotation\'` (the compiler\'s default mode already tries to compile everything it can).' },
        { id: 'b', text: 'They are aliases for the same behavior, kept for historical reasons.' },
        { id: 'c', text: '"use memo" wraps a function in `useMemo` automatically; "use no memo" wraps it in `useCallback` instead.' },
      ],
      correctChoiceId: 'a',
      explanation:
        '"use no memo" is an escape hatch for any compilation mode — useful for isolating a misbehaving component while debugging. "use memo" only changes anything under annotation mode, where the default flips from "compile everything provably safe" to "compile nothing unless explicitly marked."',
    },
    {
      id: 'q4',
      prompt: 'A teammate wants to enable the compiler on a large, years-old codebase without touching every file at once. Which combination is the standard incremental path?',
      choices: [
        { id: 'a', text: 'Add `"use no memo"` to every existing component, then remove it file by file as each one is reviewed.' },
        { id: 'b', text: 'Run `eslint-plugin-react-hooks`\' compiler rules (or `react-compiler-healthcheck`) to find violations, then scope the compiler to specific directories via Babel `overrides`, or use `compilationMode: \'annotation\'` to opt components in one at a time.' },
        { id: 'c', text: 'There is no incremental path; the compiler is all-or-nothing per project.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Both directory scoping and annotation mode exist specifically for gradual rollout. Linting or running the healthcheck first tells you how much of the codebase is already compatible before you touch any build configuration.',
    },
    {
      id: 'q5',
      prompt: 'Your codebase already has a correct `useMemo` around an expensive computation. You enable React Compiler. What happens to that `useMemo` by default?',
      choices: [
        { id: 'a', text: 'The compiler removes it, since its own analysis is more accurate.' },
        { id: 'b', text: 'The compiler leaves it in place — existing manual memoization is preserved by default — and adds its own memoization around whatever else in the component it can prove is safe.' },
        { id: 'c', text: 'The build fails, because manual and automatic memoization cannot coexist.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Manual memoization remains correct after adopting the compiler; nothing forces you to rip it out on day one. The compiler\'s own lint rule set specifically preserves existing manual memoization rather than fighting it, which is why "remove now-unnecessary useMemo/useCallback" is a cleanup you choose to do, not something the compiler requires.',
    },
    {
      id: 'q6',
      prompt: 'Which of these is still a good reason to reach for `useMemo` by hand, even in a codebase running React Compiler 1.0?',
      choices: [
        { id: 'a', text: 'To force referential stability into a component the compiler skipped (because it violates a Rule of React) or into a third-party library that does its own `===` checks.' },
        { id: 'b', text: 'To memoize any array or object literal, as a matter of habit, in every component you write.' },
        { id: 'c', text: 'To make a component render faster on its very first render.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'The compiler\'s static analysis covers the "habitual" cases better than hand-written deps arrays do, which is why (b) is no longer good practice. Memoization never speeds up a first render either way — there\'s nothing cached yet. What manual memoization still buys you is control at boundaries the compiler can\'t reach: a bailed-out component, or an external library\'s identity check.',
    },
  ],
};
