import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A custom hook calls `useState` inside an `if (userId === 0) { ... }` block that only runs for some renders. What breaks?',
      choices: [
        { id: 'a', text: 'Nothing, as long as the condition is based on props, not internal state.' },
        {
          id: 'b',
          text: "React's per-instance hook list is ordered by call position, so skipping a hook call on some renders shifts every later hook to the wrong state cell.",
        },
        { id: 'c', text: 'React throws a compile-time TypeScript error before the code can run.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Hooks are matched to state by call order, not by name or key. A hook call that is conditionally skipped desyncs every hook call after it in that render.',
    },
    {
      id: 'q2',
      prompt: 'Two sibling components both call the same custom hook, `useOnlineStatus()`. What do they get?',
      choices: [
        { id: 'a', text: 'The same shared boolean, updated once for both when the network changes.' },
        { id: 'b', text: 'Two independent subscriptions and two independent pieces of hook state.' },
        { id: 'c', text: 'A compile error — a hook can only be called from one place in the tree.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Calling a hook allocates state in that component instance, not in some global registry. Two call sites are two independent subscriptions, even though both happen to read the same external source (navigator.onLine).',
    },
    {
      id: 'q3',
      prompt:
        'With React Compiler enabled and the code following the rules of hooks, when does wrapping a callback in `useCallback` still earn its keep?',
      choices: [
        { id: 'a', text: 'Always — it is free and should be applied to every function defined in a component.' },
        {
          id: 'b',
          text: 'When a specific consumer needs the identity itself to stay stable across renders — a non-React subscription API, or a dependency your own hook lists in an effect.',
        },
        { id: 'c', text: 'Never — the Compiler makes useCallback obsolete in every case.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "The Compiler subsumes the \"skip a wasted child re-render\" use case in code it covers. useCallback still matters when identity is a contract with something outside the Compiler's reach, not an optimization.",
    },
    {
      id: 'q4',
      prompt: 'You are writing a hook that mirrors `window.matchMedia(query).matches`. Which hook should back it?',
      choices: [
        { id: 'a', text: '`useState` initialized from `matchMedia`, updated from a `useEffect` listener.' },
        { id: 'b', text: '`useSyncExternalStore`, subscribing to the media query list and reading `.matches` as the snapshot.' },
        { id: 'c', text: '`useMemo`, recomputed on every render.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'useState-plus-effect renders once with a possibly stale value and can tear under concurrent rendering — different parts of the tree observing the external value at different moments. useSyncExternalStore reads synchronously and keeps every consumer consistent within a commit.',
    },
    {
      id: 'q5',
      prompt:
        'A custom hook takes an `onMessage` callback and needs to call the latest version inside a long-lived `useEffect`, without re-running that effect every time the caller passes a new callback identity. What is the direct tool for this, stable since React 19.2?',
      choices: [
        { id: 'a', text: '`useEffectEvent`, wrapping the callback so the effect can call it without listing it as a dependency.' },
        { id: 'b', text: '`useId`, to give the callback a stable identity.' },
        { id: 'c', text: 'Omitting the callback from the dependency array and disabling the lint rule.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'useEffectEvent extracts non-reactive logic from an effect: it always sees the latest props/state but is never itself a reason to re-run the effect. Silencing exhaustive-deps instead just reintroduces the stale-closure bug the rule exists to catch.',
    },
    {
      id: 'q6',
      prompt: 'When should logic be extracted into a hook that renders a real component in a test with `renderHook`, versus tested only through a component that uses it?',
      choices: [
        {
          id: 'a',
          text: "Extract and test in isolation once the logic is used by more than one component, or its behavior (like timing or state transitions) is worth verifying without depending on any one component's markup.",
        },
        { id: 'b', text: 'Every function in a component should become a hook and get its own renderHook test, regardless of reuse.' },
        { id: 'c', text: 'Hooks cannot be tested independently of a component; renderHook only works for context providers.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "Extraction is worth it when logic is shared or has behavior worth pinning down on its own (like useDebouncedValue's timing). A single-use hook with trivial logic and no reuse can stay inline and get tested through the component.",
    },
  ],
};
