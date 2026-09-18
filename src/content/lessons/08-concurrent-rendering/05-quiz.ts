import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A component reads a prop, computes a derived value, and returns JSX — nothing else. React\'s concurrent renderer restarts this component\'s render from scratch partway through an update. What happens?',
      choices: [
        { id: 'a', text: 'Nothing visibly wrong: a pure render produces the same output no matter how many times it runs.' },
        { id: 'b', text: 'The component throws, because React does not allow re-running a render.' },
        { id: 'c', text: 'The derived value becomes stale until the next render.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'This is exactly why purity matters for concurrent rendering: React is free to abandon and restart a render because a pure function has no state to corrupt by running twice.',
    },
    {
      id: 'q2',
      prompt: 'What does wrapping a state update in `startTransition` actually change?',
      choices: [
        { id: 'a', text: 'It makes the update faster by skipping unnecessary work.' },
        { id: 'b', text: 'It marks the update as low priority, so React can interrupt it for anything more urgent and keep old content on screen while it runs.' },
        { id: 'c', text: 'It defers the update until the browser is idle, like `requestIdleCallback`.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Transitions are about priority, not speed. The work itself takes the same amount of time; what changes is that urgent updates (typing, clicks) can cut in front of it, and Suspense fallbacks are suppressed in favor of the current UI.',
    },
    {
      id: 'q3',
      prompt:
        'In development, a component with `<StrictMode>` above it renders twice on mount, but a sibling event handler that calls the same mutation only runs once per click. Why the difference?',
      choices: [
        { id: 'a', text: 'StrictMode only double-invokes code that is supposed to be pure: render bodies, state initializers, and effect setup/cleanup — not event handlers.' },
        { id: 'b', text: 'Event handlers are double-invoked too, but the second call is silently swallowed.' },
        { id: 'c', text: 'StrictMode only affects the first component that mounts, not its descendants.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'Event handlers run in response to a discrete user action and are expected to have side effects, so StrictMode leaves them alone. Anything React might legitimately call more than once for one commit — render, `useState`/`useReducer`/`useMemo` initializers, effects, ref callbacks — gets the extra invocation.',
    },
    {
      id: 'q4',
      prompt:
        'You call `startTransition(async () => { const data = await load(); setData(data); })`. After `load()` resolves, is `setData(data)` treated as transition-priority?',
      choices: [
        { id: 'a', text: 'Yes, everything inside the callback passed to startTransition is automatically a transition.' },
        { id: 'b', text: 'No — updates after an `await` need to be wrapped in their own nested `startTransition` call to stay non-urgent.' },
        { id: 'c', text: 'No, async functions cannot be passed to startTransition at all.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'React only automatically marks the synchronous portion of the action (before the first `await`). State updates after an `await` lose that context and must be re-wrapped, per the React docs’ documented (and, as of React 19, still open) limitation.',
    },
    {
      id: 'q5',
      prompt: 'When should you reach for `useDeferredValue` instead of `useTransition`?',
      choices: [
        { id: 'a', text: 'When you own the event handler that triggers the update and can wrap the state setter yourself.' },
        { id: 'b', text: 'When the value you want to lag comes from somewhere you don’t control (a parent’s prop, a router param) and you only control the expensive consumer.' },
        { id: 'c', text: 'They are interchangeable; pick whichever reads better.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`useTransition` marks an update you are making as low priority. `useDeferredValue` is for the opposite situation: you cannot change how the value updates, but you can give the expensive part of the tree a lagging copy of it.',
    },
    {
      id: 'q6',
      prompt: 'Automatic batching in React 18+ means which of these updates now batches into one re-render?',
      choices: [
        { id: 'a', text: 'Only `setState` calls made inside a React synthetic event handler, same as React 17.' },
        { id: 'b', text: '`setState` calls inside a `setTimeout` callback, a resolved promise, or a native (non-React) event listener, in addition to synthetic event handlers.' },
        { id: 'c', text: 'Only `setState` calls made inside `startTransition`.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Before React 18, batching was limited to React’s own event handlers; a `setTimeout` with three `setState` calls triggered three renders. `createRoot` extends batching to essentially every JS callback, not just React events.',
    },
  ],
};
