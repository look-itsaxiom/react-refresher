import { onReset, serverCall } from './core';

export type Todo = { id: number; title: string; done: boolean };

let todos: Todo[] = [];
let nextId = 1;

onReset(() => {
  todos = [];
  nextId = 1;
});

/** In a real app this would be a Server Function. Returns the full list after the change. */
export function getTodos(): Promise<Todo[]> {
  return serverCall(() => [...todos]);
}

export function addTodo(title: string): Promise<Todo[]> {
  return serverCall(() => {
    const trimmed = title.trim();
    if (!trimmed) throw new Error('Title is required');
    todos = [...todos, { id: nextId++, title: trimmed, done: false }];
    return [...todos];
  });
}

export function toggleTodo(id: number): Promise<Todo[]> {
  return serverCall(() => {
    todos = todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
    return [...todos];
  });
}
