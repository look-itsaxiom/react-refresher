import { useActionState, useEffect, useOptimistic, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { addTodo, getTodos, toggleTodo, type Todo } from '@server/todos';

type AddState = { error: string | null };

function ToggleButton({ todo }: { todo: Todo }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-label={`Toggle ${todo.title}`}>
      {todo.done ? 'Done' : 'Not done'}
    </button>
  );
}

export function TaskBoard() {
  const [todos, setTodos] = useState<Todo[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [optimisticTodos, addOptimisticToggle] = useOptimistic<Todo[], number>(
    todos ?? [],
    (current, id) => current.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
  );

  useEffect(() => {
    let cancelled = false;
    getTodos()
      .then((next) => {
        if (!cancelled) setTodos(next);
      })
      .catch((e) => {
        if (!cancelled) setLoadError((e as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleToggle(id: number) {
    setToggleError(null);
    addOptimisticToggle(id); // shows the flip now; React reverts it once `todos` updates (or doesn't)
    try {
      const next = await toggleTodo(id);
      setTodos(next);
    } catch (e) {
      setToggleError((e as Error).message);
    }
  }

  async function submitAdd(_prev: AddState, formData: FormData): Promise<AddState> {
    const title = String(formData.get('title') ?? '').trim();
    if (!title) return { error: 'Title is required' };
    try {
      const next = await addTodo(title);
      setTodos(next);
      return { error: null };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }
  const [addState, addAction, addPending] = useActionState<AddState, FormData>(submitAdd, { error: null });

  if (loadError) return <p role="alert">{loadError}</p>;
  if (todos === null) return <p>Loading…</p>;

  return (
    <div>
      <form action={addAction}>
        <input name="title" aria-label="New task title" placeholder="What needs doing?" />
        <button disabled={addPending}>{addPending ? 'Adding…' : 'Add task'}</button>
      </form>
      <ul>
        {optimisticTodos.map((t) => (
          <li key={t.id}>
            <form action={() => handleToggle(t.id)} style={{ display: 'inline' }}>
              <ToggleButton todo={t} />
            </form>{' '}
            {t.title}
          </li>
        ))}
      </ul>
      <div aria-live="polite">{toggleError ?? addState.error ?? ''}</div>
    </div>
  );
}

export default TaskBoard;
