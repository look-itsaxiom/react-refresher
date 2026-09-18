import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A list of comments is keyed by array index. A new comment is prepended to the front of the array (not appended). What breaks?',
      choices: [
        { id: 'a', text: 'Nothing — prepending is safe, only removing or reordering middle items is not.' },
        {
          id: 'b',
          text: "Every existing comment's fiber shifts down one position and gets matched against the wrong comment, dragging its state and DOM node along.",
        },
        { id: 'c', text: 'React throws a runtime error because two elements briefly share a key.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Prepending shifts every existing item's index by one. Since the key IS the index, React sees \"index 0 changed from comment A to comment B\" and reuses index 0's fiber — state and DOM node included — for a different comment. Any per-row state (an open reply box, a draft) ends up on the wrong row.",
    },
    {
      id: 'q2',
      prompt:
        'You render `<Fragment key={s.id}>` inside a `.map()` because each item needs to produce a `<dt>` and a `<dd>` with no wrapper. Why not just use the short `<>...</>` syntax with a key?',
      choices: [
        { id: 'a', text: 'The short syntax cannot take a `key` prop; you need the explicit `Fragment` import to key a group.' },
        { id: 'b', text: 'Short fragments are always slower to reconcile than explicit ones.' },
        { id: 'c', text: 'React ignores keys on fragments entirely, so it does not matter which syntax you use.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'The `<>...</>` shorthand does not accept any props, including `key`. To key a fragment in a list, import `Fragment` from react and write `<Fragment key={...}>`.',
    },
    {
      id: 'q3',
      prompt:
        'A multi-step form wizard needs to fully discard step 2\'s local state (including any `useState` inside it) whenever the user jumps back to step 1 and changes an earlier answer that affects step 2\'s shape. What is the most idiomatic way to force that?',
      choices: [
        { id: 'a', text: 'A `useEffect` in step 2 that resets each field when the earlier answer changes.' },
        { id: 'b', text: 'Change `<Step2 key={earlierAnswer} .../>` so the relevant identity change remounts it.' },
        { id: 'c', text: 'Wrap step 2 in `React.memo` so it only re-renders when props change.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A key change is a deliberate "this is a new instance" signal: React unmounts the old fiber and mounts a fresh one, clearing every hook inside it in one step, with no stale-value flash and no effect to write or forget.',
    },
    {
      id: 'q4',
      prompt:
        'An `<input value={draft.title ?? undefined} onChange={...}>` sometimes loses characters as you type and logs a warning the first time `draft.title` is an empty string. What is happening?',
      choices: [
        {
          id: 'a',
          text: "`?? undefined` turns a falsy-but-valid empty string into `undefined` on some renders, flipping the input between controlled and uncontrolled.",
        },
        { id: 'b', text: 'The input is fine; the warning is unrelated noise from StrictMode double-invoking effects.' },
        { id: 'c', text: '`onChange` fires twice per keystroke in React 19, doubling every character.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "`??` only falls back on `null`/`undefined`, so an empty string title passes through unchanged as `''` — the bug shows up specifically when `draft.title` itself becomes `undefined` or `null` (e.g. before a fetch resolves), at which point `value` becomes `undefined` and React hands the input back to the browser. The fix is a fallback that always yields a string: `draft.title ?? ''`.",
    },
    {
      id: 'q5',
      prompt:
        'A signup form just needs to collect fields and POST them on submit, with no per-keystroke logic. Which is the least code in React 19?',
      choices: [
        { id: 'a', text: 'Controlled inputs for every field, with a `useState` each and a submit handler that reads them all.' },
        { id: 'b', text: 'Uncontrolled inputs with `defaultValue`, read via `FormData` in a `<form action={...}>` function.' },
        { id: 'c', text: 'Uncontrolled inputs with `useRef` on each field and a submit handler that reads `.value` from every ref.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A form action receives `FormData` for the whole form in one call and resets uncontrolled fields automatically on success — no per-field state, no per-field refs, no manual `.reset()`.',
    },
    {
      id: 'q6',
      prompt: 'Which of these list-state updates is safe to combine with `key`-based identity and the React Compiler?',
      choices: [
        { id: 'a', text: 'items.sort((a, b) => a.order - b.order) then setItems(items)' },
        { id: 'b', text: 'items[i].done = true; setItems(items)' },
        { id: 'c', text: 'setItems(items.toSorted((a, b) => a.order - b.order))' },
      ],
      correctChoiceId: 'c',
      explanation:
        '`.sort()` and direct index assignment mutate the existing array/objects in place — the reference passed to `setItems` is unchanged, so React and the Compiler may not detect anything changed. `toSorted` returns a new array, giving you a real new reference to compare against the old one.',
    },
  ],
};
