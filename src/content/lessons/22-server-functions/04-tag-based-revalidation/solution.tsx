import { useEffect, useState } from 'react';
import { addTodo, getTodos, type Todo } from '@server/todos';

type Loader<T> = () => Promise<T>;

const store = new Map<string, unknown>();

/**
 * A tiny stand-in for a tag-based server cache -- the mental model behind
 * Next.js's `"use cache"` + `revalidateTag`/`updateTag`, React Router's
 * automatic loader revalidation, and TanStack Query's `invalidateQueries`.
 */
export const cache = {
  loadCount: 0,
  async cached<T>(tag: string, loader: Loader<T>): Promise<T> {
    if (store.has(tag)) {
      return store.get(tag) as T;
    }
    const value = await loader();
    store.set(tag, value);
    return value;
  },
  revalidateTag(tag: string): void {
    store.delete(tag);
  },
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
