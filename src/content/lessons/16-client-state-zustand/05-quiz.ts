import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A form has three sibling inputs that only their shared parent and each other need to see, updated on every keystroke. Should this move into a Zustand store?',
      choices: [
        { id: 'a', text: 'Yes — any state shared between more than one component belongs in a store, not in the component tree.' },
        {
          id: 'b',
          text: 'No — lifting the state to the shared parent solves it with no library, and a store would add selector/action boilerplate for state that never leaves this small subtree.',
        },
        { id: 'c', text: 'No — this should be three separate stores, one per input, so each input only reads its own slice.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A store earns its keep for cross-tree access, high-frequency updates read far apart in the tree, or access from outside components. Three sibling inputs under one parent are exactly what prop lifting is for — reaching for a store here is the overengineering, not the fix.',
    },
    {
      id: 'q2',
      prompt: 'A component does `useCartStore((s) => ({ count: s.items.length, hasItems: s.items.length > 0 }))` without `useShallow`. In Zustand v5, what actually happens?',
      choices: [
        { id: 'a', text: 'Nothing unusual — Zustand deep-compares selector results by default, so this is just a slightly wasteful but harmless pattern.' },
        {
          id: 'b',
          text: 'The selector allocates a new object every call, so it can never equal the previous one by reference; with the default equality check this throws a "Maximum update depth exceeded" error, not just an extra render.',
        },
        { id: 'c', text: 'Zustand automatically wraps object-returning selectors in useShallow internally, so this is the recommended pattern.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "An object literal selector is never reference-equal to its previous result. Every render produces a 'new' snapshot, which schedules another render, forever. useShallow compares the object's own properties instead of its reference, which is what breaks the loop.",
    },
    {
      id: 'q3',
      prompt:
        'A Zustand store keeps `cartTotal` as a field, updated inside every action that touches `items`. A new teammate adds a `applyDiscount` action and forgets to adjust `cartTotal`. What is the actual fix, not just the immediate patch?',
      choices: [
        { id: 'a', text: 'Add a code comment above cartTotal reminding future authors to update it in every action that touches items.' },
        {
          id: 'b',
          text: 'Delete the stored cartTotal field and replace every read of it with a selector that computes the total from items on demand — there is then nothing for a new action to forget to update.',
        },
        { id: 'c', text: 'Move cartTotal into a separate store that subscribes to the cart store and recomputes on every change.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Storing derived data means every mutation site is a place the invariant can be broken by omission. A selector can't go stale because it's never stored — it recomputes from the source of truth every time it's read.",
    },
    {
      id: 'q4',
      prompt: 'A component keeps a local `useState` copy of a TanStack Query result "so it is easier to edit before saving." What is the concrete risk, beyond style?',
      choices: [
        {
          id: 'a',
          text: 'The local copy and the query cache can now disagree — a background refetch, another component\'s mutation, or window refocus can update the cache while the stale local copy keeps showing the old value, or vice versa.',
        },
        { id: 'b', text: 'None — useState and TanStack Query manage completely separate concerns and never interact.' },
        { id: 'c', text: 'React will throw a warning about duplicate state sources during development, but production behavior is unaffected.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "Mirroring server data creates a second source of truth with none of the query cache's invalidation logic attached to it. Keep the edit as a real draft/form state seeded from the query result, not a permanent shadow copy of it.",
    },
    {
      id: 'q5',
      prompt: 'A checkout flow has states like "idle", "validating", "submitting", "submitted", and "failed", with rules about which transitions are legal. Modeled as four booleans in a Zustand store (`isValidating`, `isSubmitting`, `isSubmitted`, `hasError`), what goes wrong that a tool like XState prevents?',
      choices: [
        { id: 'a', text: 'Nothing — four independent booleans are strictly more flexible than a named set of states, so this is the better design.' },
        {
          id: 'b',
          text: 'The booleans can be set into combinations that describe no real state (isSubmitting and isSubmitted both true at once), because nothing enforces that only one is true; a state chart makes the illegal combination unrepresentable.',
        },
        { id: 'c', text: 'Booleans in Zustand cannot be read by selectors, only full-state subscriptions, so this is a performance problem, not a correctness one.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "A bag of independent booleans has 2^4 possible combinations for a process with 5 valid states. A state machine encodes 'currently in exactly one state, moving via defined transitions' as the data structure itself, which is the actual advantage over ad hoc flags.",
    },
    {
      id: 'q6',
      prompt: "A test calls a Zustand store's actions directly (`useCartStore.getState().addItem(...)`) to arrange data, across several test cases in the same file. What has to happen between tests, and why?",
      choices: [
        { id: 'a', text: 'Nothing — each test file gets a fresh module instance from the test runner automatically, so store state can never leak between tests.' },
        {
          id: 'b',
          text: 'The store must be reset to a known initial state (commonly in an afterEach), because it is a module-level singleton — state set by one test is still there when the next test runs unless something clears it.',
        },
        { id: 'c', text: 'The store must be recreated with a new call to create() before every single action, since setState only works once per store instance.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "A store's whole point is being reachable from outside components via getState/setState — which also means it doesn't reset itself between tests the way component-local useState would on unmount. Resetting explicitly is the tradeoff for that reach.",
    },
  ],
};
