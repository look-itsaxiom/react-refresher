import { memo, useCallback, useRef, useState } from 'react';

type Todo = { id: number; text: string; done: boolean };

const TodoRow = memo(function TodoRow({ todo, onToggle }: { todo: Todo; onToggle: (id: number) => void }) {
  const renders = useRef(0);
  renders.current += 1;
  return (
    <li data-renders={renders.current}>
      <label>
        <input type="checkbox" checked={todo.done} onChange={() => onToggle(todo.id)} />
        {todo.text}
      </label>
    </li>
  );
});

export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([
    { id: 1, text: 'Write lesson', done: false },
    { id: 2, text: 'Ship it', done: false },
  ]);
  const [tick, setTick] = useState(0);

  // FIX: the updater form means `toggle` never needs `todos` as a dependency,
  // so an empty dependency array gives it one stable identity for the component's life.
  const toggle = useCallback((id: number) => {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }, []);

  return (
    <div>
      <button onClick={() => setTick((t) => t + 1)}>Unrelated update ({tick})</button>
      <ul>
        {todos.map((todo) => (
          // FIX: pass the stable function directly — no inline wrapper creating
          // a new identity on every render.
          <TodoRow key={todo.id} todo={todo} onToggle={toggle} />
        ))}
      </ul>
    </div>
  );
}
