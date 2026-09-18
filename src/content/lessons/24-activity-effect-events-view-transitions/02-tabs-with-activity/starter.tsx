import { useState } from 'react';

function NotesPanel() {
  const [draft, setDraft] = useState('');
  return (
    <div data-testid="panel-notes">
      <h2>Notes</h2>
      <textarea
        aria-label="Notes draft"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
    </div>
  );
}

function TasksPanel() {
  return (
    <div data-testid="panel-tasks">
      <h2>Tasks</h2>
      <p>Buy milk, walk the dog.</p>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState<'notes' | 'tasks'>('notes');
  return (
    <div>
      <div role="tablist">
        <button onClick={() => setTab('notes')} aria-pressed={tab === 'notes'}>
          Notes
        </button>
        <button onClick={() => setTab('tasks')} aria-pressed={tab === 'tasks'}>
          Tasks
        </button>
      </div>
      {tab === 'notes' ? <NotesPanel /> : <TasksPanel />}
    </div>
  );
}
