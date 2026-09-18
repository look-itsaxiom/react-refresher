import { useActionState, useOptimistic } from 'react';
import { useFormStatus } from 'react-dom';
import { addTodo, type Todo } from '@server/todos';

type State = { todos: Todo[]; error: string | null };
type OptimisticTodo = Todo & { pending?: boolean };

async function submit(prev: State, formData: FormData): Promise<State> {
  const title = String(formData.get('title') ?? '').trim();
  if (!title) return { ...prev, error: 'Title is required' };
  try {
    const todos = await addTodo(title);
    return { todos, error: null };
  } catch (e) {
    return { ...prev, error: (e as Error).message };
  }
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? 'Adding…' : 'Add'}</button>;
}

export default function App() {
  const [state, formAction] = useActionState(submit, { todos: [], error: null });
  const [optimisticTodos, addOptimisticTodo] = useOptimistic<OptimisticTodo[], string>(
    state.todos,
    (current, title) => [...current, { id: -Date.now(), title, done: false, pending: true }],
  );

  function handleAction(formData: FormData) {
    const title = String(formData.get('title') ?? '').trim();
    if (title) addOptimisticTodo(title); // show it now; React drops it when `state.todos` updates
    formAction(formData);                 // then actually submit
  }

  return (
    <main>
      <form action={handleAction}>
        <input name="title" aria-label="Title" placeholder="What needs doing?" />
        <SubmitButton />
      </form>
      {state.error && <p role="alert">{state.error}</p>}
      <ul>
        {optimisticTodos.map((t) => (
          <li key={t.id} data-pending={t.pending ? 'true' : undefined} style={{ opacity: t.pending ? 0.5 : 1 }}>
            {t.title}
          </li>
        ))}
      </ul>
    </main>
  );
}
