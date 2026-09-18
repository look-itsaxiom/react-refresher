import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A settings page has eight independent fields, submits once, and needs to work with JavaScript disabled as a baseline. Which approach needs the least code and the least new dependency?',
      choices: [
        { id: 'a', text: 'React Hook Form with a Standard Schema resolver.' },
        { id: 'b', text: 'Native `<form action>` with `useActionState` and `useFormStatus`.' },
        { id: 'c', text: 'TanStack Form with per-field `form.Field` subscriptions.' },
        { id: 'd', text: 'Rebuild it as a fully controlled form with one `useState` per field.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A form action is built on the platform\'s own submission model, so it degrades to a real submit with JS disabled once wired to a server action — no library needed for "collect values, submit once." Both form libraries add real value once you need live cross-field validation, which this form does not.',
    },
    {
      id: 'q2',
      prompt:
        'A team picks React Hook Form specifically to avoid a re-render on every keystroke across a 40-field form. Which detail of RHF makes that possible?',
      choices: [
        { id: 'a', text: 'It debounces `onChange` internally so re-renders are batched every 200ms.' },
        { id: 'b', text: 'It registers each field via a `ref` and reads DOM values on demand instead of storing them in React state per keystroke.' },
        { id: 'c', text: 'It renders every field inside its own `<Suspense>` boundary.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'RHF is uncontrolled by design: `register()` attaches a ref to the DOM node, and RHF reads `.value` from the DOM when it actually needs it (on blur, change, or submit, depending on config) rather than mirroring every keystroke into React state that would re-render the tree.',
    },
    {
      id: 'q3',
      prompt:
        'A schema is written once with Zod and needs to validate the same shape in a React Hook Form resolver, a TanStack Form `validators.onChange`, and a server route handler. What makes that possible without three separate adapters?',
      choices: [
        { id: 'a', text: 'All three happen to have hard-coded a dependency on the `zod` package specifically.' },
        { id: 'b', text: 'Zod schemas implement the Standard Schema interface, which RHF, TanStack Form, and any Standard-Schema-aware server code can consume without knowing which validator library produced the schema.' },
        { id: 'c', text: 'Zod schemas compile to JSON Schema, which every one of these tools accepts natively.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Standard Schema is a shared TypeScript interface (a `~standard` property with a `validate` function) that Zod, Valibot, ArkType, and others implement identically. Consumers can type their input as `StandardSchemaV1` and accept any compliant schema, which is why the same schema module works across all three call sites.',
    },
    {
      id: 'q4',
      prompt:
        'A public marketing site\'s contact form needs client-side validation, and every extra kilobyte shipped to first-time visitors is scrutinized in code review. Zod is already used elsewhere in the codebase. What is the strongest reason to reach for Valibot just for this form instead?',
      choices: [
        { id: 'a', text: 'Valibot validates faster than Zod at runtime, which matters more than bundle size here.' },
        { id: 'b', text: 'Valibot\'s standalone-function design lets a bundler tree-shake out every validator the form does not use, unlike a chained fluent API.' },
        { id: 'c', text: 'Valibot is the only one of the two that implements Standard Schema.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Valibot\'s API is built from individual importable functions specifically so unused validators do not end up in the bundle — the opposite of a fluent chain, where tree-shaking the parts you never call is much harder. Runtime speed is not the differentiator here (both are fast enough), and both Zod and Valibot implement Standard Schema.',
    },
    {
      id: 'q5',
      prompt:
        'A form built with `useActionState` shows the right per-field error message after a failed submission, but every input goes blank at the same time — including the one the user typed correctly. What is the fix?',
      choices: [
        { id: 'a', text: 'Switch the inputs from uncontrolled to controlled and manage every value in `useState`.' },
        { id: 'b', text: 'Call `event.preventDefault()` inside the action to stop React from resetting the form.' },
        { id: 'c', text: 'Return the submitted values from the action and bind each input\'s `defaultValue` to that returned value.' },
      ],
      correctChoiceId: 'c',
      explanation:
        'React resets uncontrolled fields once a form action finishes, whether it succeeded or not — there is no built-in way to opt out of that for a specific field. Returning the submitted values as part of the action\'s state and binding them via `defaultValue` means the "reset" restores exactly what the user typed instead of the field\'s original empty default.',
    },
    {
      id: 'q6',
      prompt:
        'A submit button is disabled with the native `disabled` attribute while a form is invalid, so a user who has only filled in half the required fields cannot click it to find out what else is wrong. What is the accessibility-minded fix?',
      choices: [
        { id: 'a', text: 'Leave `disabled` as-is; a disabled button is sufficient feedback that something is wrong.' },
        { id: 'b', text: 'Use `aria-disabled` instead of `disabled` so the button stays focusable and clickable, and let the click handler reveal every remaining field error.' },
        { id: 'c', text: 'Remove the disabled state entirely and rely on a `role="alert"` banner at the top of the form instead.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A natively `disabled` button is unreachable by keyboard focus and unclickable, so it cannot double as the trigger that marks every field as submitted and shows their errors. `aria-disabled` conveys the same "not currently valid" state to assistive tech while leaving the button operable, so a submit attempt can still surface what is missing.',
    },
  ],
};
