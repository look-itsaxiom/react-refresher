import { useState } from 'react';
import { tasks as initialTasks, done, type Task } from './data';

export type { Task };

/** Would "`from` depends on `to`" create a cycle, given the existing edges in `tasks`? */
export function wouldCreateCycle(tasks: Task[], from: string, to: string): boolean {
  if (from === to) return true;
  return canReach(tasks, to, from);
}

function canReach(tasks: Task[], start: string, target: string): boolean {
  const visited = new Set<string>();
  const stack = [start];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (id === target) return true;
    if (visited.has(id)) continue;
    visited.add(id);
    const task = tasks.find((t) => t.id === id);
    if (task) stack.push(...task.dependsOn);
  }
  return false;
}

/** The loop that would exist if "`from` depends on `to`" were added: [from, to, ..., from]. */
export function findCyclePath(tasks: Task[], from: string, to: string): string[] {
  if (from === to) return [from, to];
  const path = findPath(tasks, to, from);
  return path ? [from, ...path] : [];
}

function findPath(tasks: Task[], start: string, target: string): string[] | null {
  const visited = new Set<string>();
  function dfs(id: string, trail: string[]): string[] | null {
    if (id === target) return [...trail, id];
    if (visited.has(id)) return null;
    visited.add(id);
    const task = tasks.find((t) => t.id === id);
    if (!task) return null;
    for (const dep of task.dependsOn) {
      const found = dfs(dep, [...trail, id]);
      if (found) return found;
    }
    return null;
  }
  return dfs(start, []);
}

function titleOf(tasks: Task[], id: string): string {
  return tasks.find((t) => t.id === id)?.title ?? id;
}

function isReady(task: Task, done: Set<string>): boolean {
  return task.dependsOn.every((id) => done.has(id));
}

export function DependencyEditor({ tasks: initial, done: doneSet }: { tasks: Task[]; done: Set<string> }) {
  const [tasks, setTasks] = useState<Task[]>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function addDependency(taskId: string, depId: string) {
    if (!depId) return;
    if (wouldCreateCycle(tasks, taskId, depId)) {
      const path = findCyclePath(tasks, taskId, depId).map((id) => titleOf(tasks, id));
      setErrors((prev) => ({ ...prev, [taskId]: path.join(' → ') }));
      return;
    }
    setErrors((prev) => ({ ...prev, [taskId]: '' }));
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, dependsOn: [...t.dependsOn, depId] } : t)));
  }

  function removeDependency(taskId: string, depId: string) {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, dependsOn: t.dependsOn.filter((id) => id !== depId) } : t)),
    );
  }

  return (
    <ul>
      {tasks.map((task) => {
        const options = tasks.filter((t) => t.id !== task.id && !task.dependsOn.includes(t.id));
        return (
          <li key={task.id}>
            <strong>{task.title}</strong> {isReady(task, doneSet) && <span>Ready</span>}
            <ul>
              {task.dependsOn.map((depId) => (
                <li key={depId}>
                  {titleOf(tasks, depId)}{' '}
                  <button
                    aria-label={`Remove dependency on ${titleOf(tasks, depId)} from ${task.title}`}
                    onClick={() => removeDependency(task.id, depId)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <select
              aria-label={`Add dependency for ${task.title}`}
              value=""
              onChange={(e) => addDependency(task.id, e.target.value)}
            >
              <option value="" disabled>
                Choose a task…
              </option>
              {options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.title}
                </option>
              ))}
            </select>
            {errors[task.id] && <p role="alert">Cycle: {errors[task.id]}</p>}
          </li>
        );
      })}
    </ul>
  );
}

export default function App() {
  return <DependencyEditor tasks={initialTasks} done={done} />;
}
