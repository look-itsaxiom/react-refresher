import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A dashboard renders a card grid of KPI tiles with CSS Grid, purely for layout — there is no row/column relationship between the numbers a user would want to navigate or sort by. Should it be a `<table>`?',
      choices: [
        { id: 'a', text: 'Yes — any grid of data should be a `<table>` so screen readers can announce it.' },
        {
          id: 'b',
          text: 'No — `<table>` is for content with real row/column relationships (something to scan a column of, or sort); a card grid that only visually resembles a table should stay `<div>`s laid out with Grid or Flexbox.',
        },
        { id: 'c', text: 'It does not matter, since CSS Grid and `<table>` produce identical accessibility trees.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`<table>` semantics (row, column header, cell) exist to describe data with real tabular relationships. Using it purely to get a grid layout misuses the semantics without helping anyone — CSS Grid or Flexbox is the right tool when the grid is just presentation.',
    },
    {
      id: 'q2',
      prompt: 'What is the actual difference between `dialogRef.current.show()` and `dialogRef.current.showModal()`?',
      choices: [
        { id: 'a', text: 'They are aliases; both open the dialog identically.' },
        {
          id: 'b',
          text: '`show()` opens the dialog as a plain non-modal panel (no backdrop, no top layer, no focus trap, background stays interactive); `showModal()` puts it in the top layer with a `::backdrop`, traps focus inside it, and makes Escape close it.',
        },
        { id: 'c', text: '`show()` is deprecated in favor of `showModal()` and will be removed.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Setting the `open` attribute directly or calling `.show()` displays the dialog without modal behavior — the rest of the page stays interactive and there is no backdrop or focus trap. Only `showModal()` gives you the top-layer stacking, `::backdrop`, focus trap, and Escape-to-close that make a dialog behave like a modal.',
    },
    {
      id: 'q3',
      prompt:
        'A settings panel needs to open on click, close on outside-click or Escape, and never trap focus or block the rest of the page (the user can still interact with content behind it). Which native building block fits best, with the least code?',
      choices: [
        { id: 'a', text: '`<dialog>` opened with `showModal()`.' },
        { id: 'b', text: 'A `<div popover="auto">` toggled with `popovertarget` on its trigger button.' },
        { id: 'c', text: 'A `<details>`/`<summary>` pair styled to look like a panel.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`showModal()` traps focus and blocks the rest of the page, which this panel explicitly should not do. The Popover API\'s `popover="auto"` mode gives you outside-click and Escape dismissal, top-layer stacking, and no JavaScript, without modal focus-trapping. `<details>` has no built-in outside-click dismissal.',
    },
    {
      id: 'q4',
      prompt:
        'A required `<input type="email">` shows red, invalid-looking styling the instant the page loads, before the user has typed anything. Which CSS change fixes this without touching validation logic?',
      choices: [
        { id: 'a', text: 'Style with `:user-invalid` instead of `:invalid` — it only matches after the user has interacted with the field.' },
        { id: 'b', text: 'Remove the `required` attribute so the field is never invalid.' },
        { id: 'c', text: 'Add `novalidate` to the `<form>` to disable the red styling.' },
      ],
      correctChoiceId: 'a',
      explanation:
        '`:invalid` matches from first render for any field that currently fails validation, including an untouched required empty field. `:user-invalid` only matches once the user has interacted with the field, which is almost always the UX you want — removing `required` or adding `novalidate` throws away the validation itself, not just the premature styling.',
    },
    {
      id: 'q5',
      prompt:
        'A signup form calls `setCustomValidity(\'Passwords must match\')` on the confirm-password field when the two passwords differ, inside an `onChange` handler. The user fixes the mismatch, but the field stays stuck showing that error forever. What is missing?',
      choices: [
        { id: 'a', text: 'Nothing is missing — `setCustomValidity` messages clear themselves once the underlying value becomes valid.' },
        {
          id: 'b',
          text: 'The handler needs to call `setCustomValidity(\'\')` on the branch where the passwords now match — a custom validity message stays set until something explicitly clears it with an empty string.',
        },
        { id: 'c', text: 'Custom validity messages can only be cleared by calling `form.reset()`.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Unlike the built-in constraint checks, a message set with `setCustomValidity` is sticky: the field stays invalid with that message until code calls `setCustomValidity(\'\')`. Forgetting the empty-string branch is the most common bug with this API.',
    },
    {
      id: 'q6',
      prompt:
        'A checkout form just needs to POST a handful of fields with no per-keystroke logic, and should show the browser\'s native "please fill this out" messages on invalid fields. Which combination is both the least code and gets native validation UI for free?',
      choices: [
        {
          id: 'a',
          text: 'An uncontrolled `<form>` with `required`/`type`/`pattern` attributes and a React 19 form `action`, reading fields from the `FormData` the action receives.',
        },
        { id: 'b', text: 'Controlled inputs with `useState` per field, plus a hand-written error-message component under each one.' },
        { id: 'c', text: 'Uncontrolled inputs read via `useRef`, with a submit handler that calls `.value` on every ref and writes its own error strings.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'Native constraint-validation attributes give you free validation and native error bubbles without any state; a React 19 form action then receives the whole `FormData` in one call. Both other options throw that native validation UI away and rebuild error display and field-reading by hand for no benefit here.',
    },
  ],
};
