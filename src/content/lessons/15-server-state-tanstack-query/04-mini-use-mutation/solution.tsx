import { useEffect, useState } from 'react';
import { addTodo, getTodos, type Todo } from '@server/todos';

type TodoEntry = Todo & { pending?: boolean };
let todosCache: TodoEntry[] = [];
const listeners = new Set<() => void>();

function setTodosCache(next: TodoEntry[]) {
  todosCache = next;
  listeners.forEach((listen) => listen());
}

export const stats = { getTodosCalls: 0 };

function countedGetTodos() {
  stats.getTodosCalls += 1;
  return getTodos();
}

function invalidateTodos() {
  countedGetTodos().then(setTodosCache);
}

function useTodosQuery(): TodoEntry[] {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const listen = () => forceRender((n) => n + 1);
    listeners.add(listen);
    if (todosCache.length === 0) {
      countedGetTodos().then(setTodosCache);
    }
    return () => {
      listeners.delete(listen);
    };
  }, []);

  return todosCache;
}

function useAddTodoMutation() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function mutate(title: string) {
    const trimmed = title.trim();
    if (!trimmed) return;
    setError(null);
    setIsPending(true);

    const previous = todosCache;
    setTodosCache([...todosCache, { id: -Date.now(), title: trimmed, done: false, pending: true }]);

    addTodo(trimmed).then(
      () => {
        setIsPending(false);
        // Don't hand-merge the server's response in — invalidate and let the next fetch be the
        // source of truth. The optimistic entry above was only ever a guess.
        invalidateTodos();
      },
      (err: Error) => {
        setTodosCache(previous);
        setError(err.message);
        setIsPending(false);
      },
    );
  }

  return { mutate, error, isPending };
}

export default function App() {
  const todos = useTodosQuery();
  const { mutate, error, isPending } = useAddTodoMutation();
  const [title, setTitle] = useState('');

  return (
    <main>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutate(title);
          setTitle('');
        }}
      >
        <input aria-label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button type="submit" disabled={isPending}>
          {isPending ? 'Adding…' : 'Add'}
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      <ul>
        {todos.map((t) => (
          <li key={t.id} data-pending={t.pending ? 'true' : undefined}>
            {t.title}
          </li>
        ))}
      </ul>
    </main>
  );
}
