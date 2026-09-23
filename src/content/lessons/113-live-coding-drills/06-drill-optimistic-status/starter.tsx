import { useEffect, useState } from 'react';
import { addTodo, getTodos, toggleTodo, type Todo } from '@server/todos';

// TODO:
// - toggle status through a form action that uses useOptimistic, so the flip shows immediately
// - roll back and show an inline error (in an aria-live="polite" region) if toggleTodo rejects
// - disable only the toggled row while its toggle is pending (useFormStatus, one <form> per row)
// - add a task with useActionState: pending label on submit, input clears on success

export function TaskBoard() {
  const [todos, setTodos] = useState<Todo[] | null>(null);
  const [title, setTitle] = useState('');

  useEffect(() => {
    getTodos().then(setTodos);
  }, []);

  async function handleToggle(id: number) {
    try {
      const next = await toggleTodo(id);
      setTodos(next);
    } catch {
      // TODO: no rollback UI yet — the row just silently fails to flip.
    }
  }

  async function handleAdd() {
    if (!title.trim()) return;
    const next = await addTodo(title.trim());
    setTodos(next);
    setTitle('');
  }

  if (todos === null) return <p>Loading…</p>;

  return (
    <div>
      <input aria-label="New task title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <button onClick={handleAdd}>Add task</button>
      <ul>
        {todos.map((t) => (
          <li key={t.id}>
            <button aria-label={`Toggle ${t.title}`} onClick={() => handleToggle(t.id)}>
              {t.done ? 'Done' : 'Not done'}
            </button>{' '}
            {t.title}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TaskBoard;
