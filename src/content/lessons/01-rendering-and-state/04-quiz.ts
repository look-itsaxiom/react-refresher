import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt: 'A handler runs `setN(n + 1)` twice in a row where `n` is `5`. After the re-render, what is `n`?',
      choices: [{ id: 'a', text: '7' }, { id: 'b', text: '6' }, { id: 'c', text: '5, the render is skipped' }],
      correctChoiceId: 'b',
      explanation: 'Both calls read the same snapshot (`5`) and queue "set to 6". Use `setN(c => c + 1)` to get 7.',
    },
    {
      id: 'q2',
      prompt: 'Which statement about batching in React 18+ is true?',
      choices: [
        { id: 'a', text: 'Only updates inside React event handlers are batched.' },
        { id: 'b', text: 'Updates in timeouts, promises, and native listeners are batched too.' },
        { id: 'c', text: 'Batching only happens in production builds.' },
      ],
      correctChoiceId: 'b',
      explanation: 'React 18 introduced automatic batching for all updates, not just those inside synthetic event handlers.',
    },
    {
      id: 'q3',
      prompt: 'You want a form to clear its fields whenever `userId` changes. What is the most idiomatic fix?',
      choices: [
        { id: 'a', text: 'A `useEffect` on `userId` that calls each setter with an empty string.' },
        { id: 'b', text: 'Render the form with `key={userId}`.' },
        { id: 'c', text: 'Store `userId` in state and compare it on every render.' },
      ],
      correctChoiceId: 'b',
      explanation: 'Changing the key remounts the component with fresh state. No effect, no extra render, no drift.',
    },
    {
      id: 'q4',
      prompt: 'Why is using the array index as a `key` a problem?',
      choices: [
        { id: 'a', text: 'It is slower because indexes are numbers.' },
        { id: 'b', text: 'React throws an error for numeric keys.' },
        { id: 'c', text: 'After inserts, removals, or reorders, state and DOM get attached to the wrong item.' },
      ],
      correctChoiceId: 'c',
      explanation: 'Keys are identity. An index says "whatever is at position i is the same item as before", which is false after the list changes shape.',
    },
    {
      id: 'q5',
      prompt: 'Which of these is allowed during the render phase?',
      choices: [
        { id: 'a', text: 'Computing `total` from `items` with `reduce`.' },
        { id: 'b', text: 'Pushing onto an array received as a prop.' },
        { id: 'c', text: 'Calling `fetch` and setting state when it resolves.' },
      ],
      correctChoiceId: 'a',
      explanation: 'Rendering must be pure: derive values freely, but never mutate inputs or start side effects. Concurrent rendering and the Compiler both rely on that.',
    },
  ],
};
