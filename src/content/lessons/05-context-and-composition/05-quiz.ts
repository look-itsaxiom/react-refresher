import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A `Layout` component receives `user` and `theme` props purely to forward them to a `Sidebar` two levels down. What should you try before reaching for context?',
      choices: [
        { id: 'a', text: 'Wrap `Layout` in `React.memo` so the extra props stop mattering.' },
        { id: 'b', text: 'Have whoever assembles the tree pass the finished `Sidebar` element as `children`, so `Layout` never sees `user` or `theme` at all.' },
        { id: 'c', text: 'Move `user` and `theme` into a global variable outside React.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`Layout` only forwards these props because it hard-codes what it contains. Passing the already-built element as `children` removes the need for `Layout` to know about `user` or `theme` in the first place — no new API required.',
    },
    {
      id: 'q2',
      prompt: 'Which scenario is a better fit for context than for passing `children`?',
      choices: [
        { id: 'a', text: 'A `Card` component that always wraps a `Title` and a `Body` you control at the call site.' },
        { id: 'b', text: 'A compound `Menu`/`MenuItem` pair where any `MenuItem`, at any depth the caller chooses, needs to know which item is highlighted.' },
        { id: 'c', text: 'A `Page` that passes `currentUser` straight to the one `Greeting` component that renders it.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The other two are fixed, shallow relationships composition handles cleanly. `MenuItem` can appear at arbitrary depth and needs shared state it did not receive as a direct prop — the case context is for.',
    },
    {
      id: 'q3',
      prompt: 'In React 19, what is the relationship between `<ThemeContext value={x}>` and `<ThemeContext.Provider value={x}>`?',
      choices: [
        { id: 'a', text: 'They are equivalent; `.Provider` is the legacy form kept for older code, and `<ThemeContext>` is the new one.' },
        { id: 'b', text: '`<ThemeContext.Provider>` is deprecated and throws a warning in React 19.' },
        { id: 'c', text: '`<ThemeContext value={x}>` only works for contexts created with a `use19Context` helper.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'React 19 lets you render the context object directly as a provider. `.Provider` still works and is not deprecated — it is simply the older spelling.',
    },
    {
      id: 'q4',
      prompt: 'A component reads context inside an `if` block, after an early return, based on a prop. Which hook makes that legal?',
      choices: [
        { id: 'a', text: '`useContext`, because context reads were always exempt from the Rules of Hooks.' },
        { id: 'b', text: '`use`, because it is not itself a hook and can be called conditionally.' },
        { id: 'c', text: 'Neither — conditional context reads require lifting the `if` into a separate component.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`use` can be called inside conditionals, loops, and after early returns. `useContext` cannot: like all hooks, it must run unconditionally on every render.',
    },
    {
      id: 'q5',
      prompt:
        'A `CounterContext` provides `{ count, setCount }` as one object. A toolbar component only ever calls `setCount` and never reads `count`. What happens when `count` changes elsewhere in the app?',
      choices: [
        { id: 'a', text: 'The toolbar re-renders too, because it consumes the same context object that changed.' },
        { id: 'b', text: 'The toolbar never re-renders, because it does not read `count` directly.' },
        { id: 'c', text: 'React automatically splits the object so only the changed field triggers re-renders.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'Context re-renders every consumer whenever the provided value changes, regardless of which fields a given consumer actually uses. Splitting state and dispatch into two separate contexts is how you avoid this, not React doing it for you.',
    },
    {
      id: 'q6',
      prompt:
        'A dashboard needs to show a live value that updates 30 times a second from a WebSocket, read by a handful of components scattered across the tree. What is the strongest reason to reach for an external store (e.g. Zustand) instead of context?',
      choices: [
        { id: 'a', text: 'Context cannot hold non-serializable values like functions.' },
        { id: 'b', text: 'Every context consumer re-renders on every update, and context has no built-in way to subscribe to only the slice of state a component actually reads.' },
        { id: 'c', text: 'Context providers cannot be nested more than a few levels deep.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Context has no selective-subscription mechanism: any change to the provided value re-renders every consumer. External stores built on `useSyncExternalStore` let components subscribe to just the slice they need, which matters at high update frequencies.',
    },
  ],
};
