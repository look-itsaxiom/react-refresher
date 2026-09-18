import { useEffect, useState } from 'react';
import { addTodo, getTodos, type Todo } from '@server/todos';

type Loader<T> = () => Promise<T>;

/**
 * A tiny stand-in for a tag-based server cache -- the mental model behind
 * Next.js's `"use cache"` + `revalidateTag`/`updateTag`, React Router's
 * automatic loader revalidation, and TanStack Query's `invalidateQueries`.
 */
export const cache = {
  loadCount: 0,
  // TODO: memoize the loader's result per tag. A second `cached(tag, ...)`
  // call for the same tag should return the memoized value without
  // calling `loader` again.
  async cached<T>(tag: string, loader: Loader<T>): Promise<T> {
    return loader();
  },
  // TODO: forget the memoized value for `tag`, so the next `cached()`
  // call for it runs `loader` again.
  revalidateTag(_tag: string): void {},
};

function loadTodos(): Promise<Todo[]> {
  cache.loadCount++;
  return getTodos();
}

/** Simulates a Server Function that mutates, then revalidates before the next read. */
export async function addTodoAction(_prevTodos: Todo[], formData: FormData): Promise<Todo[]> {
  const title = String(formData.get('title') ?? '').trim();
  if (title) await addTodo(title);
  cache.revalidateTag('todos');
  return cache.cached('todos', loadTodos);
}

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    cache.cached('todos', loadTodos).then(setTodos);
  }, []);

  async function handleSubmit(formData: FormData) {
    setTodos(await addTodoAction(todos, formData));
  }

  return (
    <main>
      <form action={handleSubmit}>
        <input name="title" aria-label="Title" placeholder="What needs doing?" />
        <button>Add</button>
      </form>
      <ul>
        {todos.map((t) => (
          <li key={t.id}>{t.title}</li>
        ))}
      </ul>
    </main>
  );
}
