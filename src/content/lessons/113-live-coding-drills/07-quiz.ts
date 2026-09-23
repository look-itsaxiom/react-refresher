import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        '"Why `useDeferredValue` instead of a debounced `setTimeout` for the task table\'s filter?" What\'s the real difference, not just the code size?',
      choices: [
        { id: 'a', text: 'They behave the same; `useDeferredValue` is just shorter to write.' },
        {
          id: 'b',
          text: 'The input stays synchronous and always shows what was typed; React re-renders the expensive filtered list at lower priority and can interrupt that work if more typing arrives, with no fixed delay to tune.',
        },
        { id: 'c', text: '`useDeferredValue` cancels the network request a debounce would have sent.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A debounce delays the *input* update by a fixed timer, which lags the field itself. `useDeferredValue` keeps the field synchronous and defers only the expensive downstream render, at a priority React can interrupt — no timer to tune, and no dropped keystrokes under load.',
    },
    {
      id: 'q2',
      prompt:
        '"What breaks if the task table\'s rows are keyed by their index in the filtered-and-sorted array instead of by `row.id`?"',
      choices: [
        { id: 'a', text: 'Nothing — index keys are fine as long as the list is windowed.' },
        {
          id: 'b',
          text: 'Every sort or filter change reassigns which DOM node "is" which row, since the same index now points at different data — component state and focus attach to the wrong row.',
        },
        { id: 'c', text: 'It only matters for lists longer than about 1,000 items.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Keys are identity, not position. Sorting and filtering both reorder the array, so an index key silently reassigns each DOM node (and any state it holds) to a different task on every re-render — windowing makes this worse, since the same *visible* index now corresponds to totally different underlying rows as the user scrolls or re-sorts.',
    },
    {
      id: 'q3',
      prompt: '"When would you *not* reach for `useOptimistic` on a mutation?"',
      choices: [
        {
          id: 'a',
          text: 'When the UI has nowhere sensible to show a provisional, unconfirmed value — e.g. a destructive action whose result the user must actually see confirmed before moving on, or a mutation with no natural "pending" representation in the UI.',
        },
        { id: 'b', text: 'Whenever the request might take longer than 300ms.' },
        { id: 'c', text: 'Whenever the mutation is wrapped in a `<form action>`.' },
      ],
      correctChoiceId: 'a',
      explanation:
        '`useOptimistic` is for mutations where showing the likely outcome immediately genuinely helps the user, and a wrong guess is cheap to roll back. For anything where showing a value before it\'s confirmed would be misleading or costly to undo, show a pending state instead and wait for the real response.',
    },
    {
      id: 'q4',
      prompt:
        '"Why call `addOptimistic(id)` as the first line inside the form action, instead of calling it from the button\'s `onClick` right before the form submits?"',
      choices: [
        {
          id: 'a',
          text: 'It works either way; it\'s a style preference.',
        },
        {
          id: 'b',
          text: 'React only knows to automatically revert an optimistic update at the end of the *transition* the update was issued inside of. An action function\'s body runs inside that transition; a plain `onClick` firing before submission does not, so the optimistic value would never clear itself.',
        },
        { id: 'c', text: '`onClick` handlers cannot read the row\'s id from the closure.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The optimistic update needs to be issued inside the same transition whose completion React uses to decide when to drop it. That transition is the action itself — so the update call belongs inside the action function, before its first `await`, not in a handler that runs before the action starts.',
    },
    {
      id: 'q5',
      prompt:
        '"The task table hand-rolls windowing instead of measuring the container with `getBoundingClientRect` — why?"',
      choices: [
        { id: 'a', text: '`getBoundingClientRect` is deprecated.' },
        {
          id: 'b',
          text: 'A fixed row height and a known container height make the visible slice computable from `scrollTop` alone — no measurement, no `ResizeObserver`, and it behaves identically in a test environment (like jsdom) where real layout isn\'t computed.',
        },
        { id: 'c', text: 'It only matters because the fixture has exactly 5,000 rows.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Fixed dimensions turn "which rows are visible" into arithmetic on `scrollTop`, with no layout measurement involved. That\'s simpler in a real browser and is what makes the behavior testable at all in jsdom, which never actually paints or lays out elements.',
    },
    {
      id: 'q6',
      prompt:
        '"`wouldCreateCycle(tasks, from, to)` checks whether `to` can already reach `from` — why search in that direction instead of checking whether `from` can reach `to`?"',
      choices: [
        {
          id: 'a',
          text: 'Because the edge being added is "`from` depends on `to`"; a cycle exists exactly when `to` already has an existing path of dependencies leading back to `from` — that\'s the loop the new edge would close.',
        },
        { id: 'b', text: 'Both directions are equivalent; either search works.' },
        { id: 'c', text: 'Because `from` is always closer to the root of the dependency graph.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'Adding "`from` depends on `to`" only creates a cycle if you can already get from `to` back to `from` by following existing `dependsOn` edges — that path, plus the new edge, is the loop. Checking whether `from` can reach `to` answers a different (and here, irrelevant) question.',
    },
  ],
};
