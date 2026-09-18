import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { addTodo, type Todo } from '@server/todos';

type State = { todos: Todo[]; error: string | null };

async function submit(prev: State, formData: FormData): Promise<State> {
  const title = String(formData.get('title') ?? '').trim();
  const owner = String(formData.get('owner') ?? '').trim();
  if (!owner) return { ...prev, error: 'Owner is required' };
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

  return (
    <main>
      <form action={formAction}>
        <div>
          <label htmlFor="title">Title</label>
          <input id="title" name="title" />
        </div>
        <div>
          <label htmlFor="owner">Owner</label>
          <input id="owner" name="owner" />
        </div>
        <SubmitButton />
      </form>
      {state.error && <p role="alert">{state.error}</p>}
      <ul>
        {state.todos.map((t) => (
          <li key={t.id}>{t.title}</li>
        ))}
      </ul>
    </main>
  );
}
