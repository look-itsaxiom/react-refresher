import { useState } from 'react';
import { tasks as initialTasks, done, type Task } from './data';

export type { Task };

// TODO: would "`from` depends on `to`" create a cycle, given the existing edges in `tasks`?
export function wouldCreateCycle(tasks: Task[], from: string, to: string): boolean {
  return false;
}

// TODO: the loop that would exist if "`from` depends on `to`" were added: [from, to, ..., from].
// Return [] if there's no cycle.
export function findCyclePath(tasks: Task[], from: string, to: string): string[] {
  return [];
}

function titleOf(tasks: Task[], id: string): string {
  return tasks.find((t) => t.id === id)?.title ?? id;
}

function isReady(task: Task, done: Set<string>): boolean {
  return task.dependsOn.every((id) => done.has(id));
}

export function DependencyEditor({ tasks: initial, done: doneSet }: { tasks: Task[]; done: Set<string> }) {
  const [tasks, setTasks] = useState<Task[]>(initial);

  // TODO:
  // - a <select> per task, aria-label="Add dependency for <title>", listing every other task
  // - choosing an option adds it as a dependency, unless wouldCreateCycle says it would loop —
  //   in that case, show an inline error naming the cycle (use findCyclePath + titleOf)
  // - a real <button> per existing dependency, aria-label="Remove dependency on <dep> from <title>"
  // - a "Ready" badge (any text is fine) when every dependency id is in `doneSet`

  return (
    <ul>
      {tasks.map((task) => (
        <li key={task.id}>
          <strong>{task.title}</strong>
          {isReady(task, doneSet) && <span>Ready</span>}
          <ul>
            {task.dependsOn.map((depId) => (
              <li key={depId}>{titleOf(tasks, depId)}</li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

export default function App() {
  return <DependencyEditor tasks={initialTasks} done={done} />;
}
