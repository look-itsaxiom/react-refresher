Start from the action: `async function submit(prev: State, formData: FormData): Promise<State>`. Return the next state instead of calling setters.
---
`const [state, formAction] = useActionState(submit, { todos: [], error: null })`, then `<form action={formAction}>`.
---
`useFormStatus` comes from `react-dom`, not `react`, and only works in a component rendered inside the form. Make a `SubmitButton` component.
---
You do not need to clear the input yourself. When a form action completes, React resets uncontrolled fields.
