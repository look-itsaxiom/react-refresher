import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A component calls `items.sort(compareFn)` on an array it received as a prop, then renders the sorted result. React Compiler is enabled. What happens?',
      choices: [
        { id: 'a', text: 'The Compiler rewrites `.sort()` into `.toSorted()` automatically, so the prop is safe.' },
        {
          id: 'b',
          text: "Nothing is rewritten — the prop array is mutated in place, which is a bug whether or not the Compiler is running. The Compiler's immutability rule can flag it, but fixing it is on you.",
        },
        { id: 'c', text: 'The Compiler throws a build error and refuses to compile the file.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "The Compiler optimizes code that follows the rules; it does not rewrite your logic or fix mutations for you. A component that mutates a prop keeps running exactly as written — unmemoized where the Compiler bails out, and still buggy either way.",
    },
    {
      id: 'q2',
      prompt: 'What actually happens when React Compiler encounters a rule violation in one component of your app?',
      choices: [
        { id: 'a', text: 'It throws a runtime error the first time that component renders.' },
        {
          id: 'b',
          text: 'It bails out on that specific component (or hook), leaving it unmemoized and running as-authored — the rest of the app is compiled normally.',
        },
        { id: 'c', text: 'It disables memoization for the whole application to stay consistent.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Compilation is per-component. A violation is a local bailout, not a global one — which is also why a rule violation in one rarely-used component is easy to miss without lint rules pointing at it.',
    },
    {
      id: 'q3',
      prompt:
        'A hook reads `containerRef.current.getBoundingClientRect()` directly in the component body (not inside an effect or handler) to decide a CSS class. What is the concrete, observable failure?',
      choices: [
        { id: 'a', text: 'It works fine; refs are just a faster way to read the DOM than state.' },
        {
          id: 'b',
          text: "It throws on the first render, because `containerRef.current` is still `null` — the ref hasn't attached to a mounted DOM node yet when the component body first runs.",
        },
        { id: 'c', text: 'It silently returns an empty object with no error.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Refs attach after render commits to the DOM, not during it. Reading `.current` in the render body reads it before it exists on first render — move the read into `useEffect` (after mount) and keep the result in state.",
    },
    {
      id: 'q4',
      prompt:
        'You pass a `columns` array literal to a TanStack Table hook, built fresh inline on every render: `useReactTable({ columns: [...], data })`. React Compiler is enabled and this component has no rule violations. Does the Compiler fix the resulting instability?',
      choices: [
        {
          id: 'a',
          text: "No — the instability is a requirement the table library imposes on its arguments, not on this component's own re-render behavior, so `useMemo` around `columns` is still the right fix.",
        },
        { id: 'b', text: 'Yes, the Compiler always stabilizes every array literal in a component body.' },
        { id: 'c', text: 'It depends on whether the array has more than three elements.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "The Compiler memoizes values based on how *your* component uses them, not based on a third-party library's internal reference-equality checks. A contract imposed by code the Compiler doesn't compile still needs manual `useMemo`.",
    },
    {
      id: 'q5',
      prompt:
        'A `React.memo`-wrapped child keeps re-rendering every time its parent re-renders, even though the child\'s own props look unchanged in the React DevTools inspector. What is the most likely cause?',
      choices: [
        {
          id: 'a',
          text: '`React.memo` is broken for function components with more than one prop.',
        },
        {
          id: 'b',
          text: 'One of the props (often a callback or inline object/array) is a new reference each render even though its contents look the same — `React.memo`\'s shallow comparison treats that as changed.',
        },
        { id: 'c', text: 'The child needs to also be wrapped in `useMemo`, not just `React.memo`.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`React.memo` compares props with `Object.is` per key, not deep equality. An inline arrow function or object literal passed as a prop is a new reference every render regardless of its contents, which defeats the memoization.',
    },
    {
      id: 'q6',
      prompt:
        "A codebase has fully adopted React Compiler and passes all its lint rules. A reviewer asks why a particular `useCallback` is still in the diff. What's the right way to justify keeping it?",
      choices: [
        {
          id: 'a',
          text: '"It doesn\'t hurt to leave it in, and removing memoization always feels risky."',
        },
        {
          id: 'b',
          text: '"This callback\'s identity is a dependency of a `useEffect` (or is handed to a non-React subscription API) that needs it stable across renders — that\'s a correctness requirement the Compiler doesn\'t know about, not a render-count optimization."',
        },
        { id: 'c', text: '"React Compiler only works on class components, so this one is still needed."' },
      ],
      correctChoiceId: 'b',
      explanation:
        "The Compiler subsumes 'skip a wasted re-render.' It doesn't know about correctness constraints external to rendering — an effect dependency, a subscribe/unsubscribe pair, a ref callback. Justify manual memoization by naming the specific external contract it satisfies, not by habit.",
    },
  ],
};
