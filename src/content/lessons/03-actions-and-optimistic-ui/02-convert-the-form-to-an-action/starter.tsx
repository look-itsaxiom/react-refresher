import { useState, type FormEvent } from 'react';
import { addTodo, type Todo } from '@server/todos';

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending] = useState(false); // never updated

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const title = String(formData.get('title') ?? '').trim();
    if (!title) {
      setError('Title is required');
      return;
    }
    try {
      const next = await addTodo(title);
      setTodos(next);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <main>
      <form onSubmit={handleSubmit}>
        <input name="title" aria-label="Title" placeholder="What needs doing?" />
        <button disabled={pending}>{pending ? 'Adding…' : 'Add'}</button>
      </form>
      {error && <p role="alert">{error}</p>}
      <ul>
        {todos.map((t) => (
          <li key={t.id}>{t.title}</li>
        ))}
      </ul>
    </main>
  );
}
