import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt: 'A component fetches `/api/users/${id}` inside a `useEffect` keyed on `id`. The user changes `id` twice quickly. What can go wrong?',
      choices: [
        { id: 'a', text: 'Nothing; React automatically cancels the first request.' },
        { id: 'b', text: 'The first request can resolve after the second and overwrite the fresher data.' },
        { id: 'c', text: 'The effect will not run a second time until the first request resolves.' },
      ],
      correctChoiceId: 'b',
      explanation: 'Effects do not cancel in-flight work for you. Without an ignore flag or AbortController, a slower earlier response can land after a faster later one and clobber it.',
    },
    {
      id: 'q2',
      prompt: 'A form field should clear whenever the selected `recordId` changes. What is the most idiomatic fix?',
      choices: [
        { id: 'a', text: 'A `useEffect` on `recordId` that calls the setter with an empty string.' },
        { id: 'b', text: 'Render the form with `key={recordId}`.' },
        { id: 'c', text: 'Store `recordId` in a ref and compare it on every render.' },
      ],
      correctChoiceId: 'b',
      explanation: 'Changing the key unmounts the old instance and mounts a fresh one with fresh state. No effect, no extra render, no frame where the stale value is still visible.',
    },
    {
      id: 'q3',
      prompt: 'A "Saved!" toast should appear right after a successful save. Where should that call live?',
      choices: [
        { id: 'a', text: 'In a `useEffect` that watches a `justSaved` boolean the handler sets.' },
        { id: 'b', text: 'Directly in the save button\'s click handler, after the save succeeds.' },
        { id: 'c', text: 'In a `useLayoutEffect` so it fires before paint.' },
      ],
      correctChoiceId: 'b',
      explanation: 'The handler already knows why the save happened. An effect watching a flag only knows state changed, which is strictly less information for no benefit — and it is an extra render besides.',
    },
    {
      id: 'q4',
      prompt: 'What does React\'s StrictMode double-invocation of effects in development actually verify?',
      choices: [
        { id: 'a', text: 'That your component renders twice as fast as it should.' },
        { id: 'b', text: 'That an effect\'s cleanup correctly undoes whatever the effect set up, so mount → cleanup → mount again ends in the same state.' },
        { id: 'c', text: 'That your effects have no dependencies.' },
      ],
      correctChoiceId: 'b',
      explanation: 'StrictMode mounts, runs effects, cleans up, and runs them again to catch missing or incorrect cleanup. An effect with a matching, correct cleanup is unaffected by the extra cycle; production only runs it once regardless.',
    },
    {
      id: 'q5',
      prompt: 'An effect subscribes to a room and calls a `notify` callback on every message, where `notify` is a new inline function on every render. Listing `notify` as a dependency causes:',
      choices: [
        { id: 'a', text: 'A stale closure, because the effect never sees the latest `notify`.' },
        { id: 'b', text: 'The effect to resubscribe on every render, even ones that have nothing to do with the room.' },
        { id: 'c', text: 'A TypeScript error, since inline functions cannot be dependencies.' },
      ],
      correctChoiceId: 'b',
      explanation: 'A new function identity every render means the dependency "changes" every render, so the effect tears down and re-runs constantly. `useEffectEvent` fixes this by giving the callback access to the latest values without it being a dependency at all.',
    },
    {
      id: 'q6',
      prompt: 'When is `useRef` the right tool instead of `useState`?',
      choices: [
        { id: 'a', text: 'When the value needs to persist across renders but changing it should not, by itself, cause a re-render.' },
        { id: 'b', text: 'Whenever the value is a number instead of an object.' },
        { id: 'c', text: 'Whenever you want the value to reset on every render.' },
      ],
      correctChoiceId: 'a',
      explanation: 'Both `useRef` and `useState` persist a value across renders. The difference is that mutating `ref.current` never schedules a re-render, which is exactly what you want for things like timer IDs or a previous value kept only for comparison in an effect.',
    },
  ],
};
