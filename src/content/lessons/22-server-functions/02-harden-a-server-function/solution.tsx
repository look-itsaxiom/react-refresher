import { useActionState } from 'react';
import { addTodo, type Todo } from '@server/todos';

/**
 * Stands in for a cookie-backed session a real server would read (e.g.
 * `cookies()` + `auth()`). Exported as a mutable value only so this
 * exercise can be graded -- a real Server Function would never import an
 * identity like this.
 */
export type Session = { userId: string } | null;
export let session: Session = { userId: 'u1' };
export function setSession(next: Session): void {
  session = next;
}

type ActionState = {
  todos: Todo[];
  errors: { auth?: string; title?: string };
};

const initialState: ActionState = { todos: [], errors: {} };

/** Simulates a Server Function ('use server' in a real app). */
export async function createTodoAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  // Every Server Function is a public endpoint: authenticate from the
  // server's own session, never from a field the client filled in.
  if (!session) {
    return { ...prevState, errors: { auth: 'You must be signed in to add a todo.' } };
  }

  const title = String(formData.get('title') ?? '').trim();
  if (!title) {
    return { ...prevState, errors: { title: 'Title is required' } };
  }

  try {
    const todos = await addTodo(title);
    return { todos, errors: {} };
  } catch (e) {
    // Never let a Server Function throw into the caller uncaught -- report
    // it through the typed result instead.
    return { ...prevState, errors: { title: (e as Error).message } };
  }
}

export default function App() {
  const [state, formAction] = useActionState(createTodoAction, initialState);

  return (
    <main>
      <form action={formAction}>
        <input name="title" aria-label="Title" placeholder="What needs doing?" />
        <button>Add</button>
      </form>
      {state.errors.auth && <p role="alert">{state.errors.auth}</p>}
      {state.errors.title && <p role="alert">{state.errors.title}</p>}
      <ul>
        {state.todos.map((t) => (
          <li key={t.id}>{t.title}</li>
        ))}
      </ul>
    </main>
  );
}
