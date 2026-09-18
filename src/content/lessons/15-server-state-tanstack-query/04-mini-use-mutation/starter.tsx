import { useEffect, useState } from 'react';
import { addTodo, getTodos, type Todo } from '@server/todos';

// A tiny stand-in for a QueryClient's cache, scoped to one key: the todo list. Real TanStack
// Query keys every entry by an array (e.g. ['todos']) and manages many at once; here there's
// only one list, so a module-level variable plays the same role.
type TodoEntry = Todo & { pending?: boolean };
let todosCache: TodoEntry[] = [];
const listeners = new Set<() => void>();

function setTodosCache(next: TodoEntry[]) {
  todosCache = next;
  listeners.forEach((listen) => listen());
}

// How many times the "server" has actually been asked for the todo list — a successful mutation
// that invalidates correctly should cause this to go up, not just splice its own guess into the
// cache.
export const stats = { getTodosCalls: 0 };

function countedGetTodos() {
  stats.getTodosCalls += 1;
  return getTodos();
}

/** Refetch the authoritative list from the server and replace the cache with it. */
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

// TODO: implement this. It should return { mutate, error, isPending } — see prompt.md.
function useAddTodoMutation() {
  return { mutate: (_title: string) => {}, error: null as string | null, isPending: false };
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
