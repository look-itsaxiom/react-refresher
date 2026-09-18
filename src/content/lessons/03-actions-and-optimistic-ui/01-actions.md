# Actions: async transitions with built-in pending, error, and reset

React 19 gave the transition idea a second job. If the function you pass to `startTransition` is `async`, React keeps the transition pending until the promise settles. A function used that way is called an **Action**. Forms, buttons, and a few new hooks are built around it.

## `<form action={fn}>`

Pass a function to a form's `action` prop and React will:

1. call it with the `FormData` when the form submits (no `event.preventDefault()` needed),
2. run it inside a transition, so `isPending`-style state is available,
3. **reset uncontrolled fields after the action finishes**, like a native form submission would.

```tsx
async function createTodo(formData: FormData) {
  await addTodo(String(formData.get('title')));
}

<form action={createTodo}>
  <input name="title" />
  <button>Add</button>
</form>
```

In a framework with Server Functions, `createTodo` can be marked `'use server'` and live on the server; the client code does not change. In this sandbox `@server/todos` plays that role with fake latency.

## `useActionState`

Most forms need the result of the last submission: an error message, the updated list, a success flag. `useActionState` wraps an action so its return value becomes state:

```tsx
type State = { todos: Todo[]; error: string | null };

async function submit(prev: State, formData: FormData): Promise<State> {
  const title = String(formData.get('title') ?? '').trim();
  if (!title) return { ...prev, error: 'Title is required' };
  const todos = await addTodo(title);
  return { todos, error: null };
}

const [state, formAction, isPending] = useActionState(submit, { todos: [], error: null });
<form action={formAction}>…</form>
```

The action receives the **previous state** first, then the form data. Whatever it returns is the next `state`. `isPending` is true while it runs.

## `useFormStatus`

A submit button often lives in its own component so it can be reused. `useFormStatus()` reads the status of the **parent form** without prop drilling:

```tsx
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? 'Adding…' : 'Add'}</button>;
}
```

It must be rendered *inside* the `<form>`; it does not work in the component that renders the form itself.

## Error handling

Throwing inside an action propagates to the nearest error boundary. For expected failures (validation, a 4xx from the server) return them as part of the state instead, as `submit` does above.

In the exercise you will convert a hand-rolled `useState` + `onSubmit` form into an action-based one. The checks look for behavior only: pending UI, error display, and the automatic reset that only actions give you.
