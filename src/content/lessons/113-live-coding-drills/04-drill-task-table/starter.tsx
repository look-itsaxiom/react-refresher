import { useState } from 'react';
import { rows as allRows, type TaskRow } from './data';

// TODO: this renders every row, unfiltered and unsorted. Your job:
// - filter by title (case-insensitive), driven by useDeferredValue
// - sortable title/status/dueDate columns with aria-sort on the active columnheader
// - windowed rendering: only rows near the current scroll position should exist in the DOM
// - a status summary reflecting the full filtered set
// - an empty state when nothing matches

export function TaskTable({ rows }: { rows: TaskRow[] }) {
  const [filter, setFilter] = useState('');

  return (
    <div>
      <label>
        Filter by title <input aria-label="Filter by title" value={filter} onChange={(e) => setFilter(e.target.value)} />
      </label>
      <p>{rows.length} tasks</p>
      <div role="table" aria-label="Tasks">
        <div role="row">
          <span role="columnheader">Title</span>
          <span role="columnheader">Status</span>
          <span role="columnheader">Due date</span>
        </div>
        {rows.map((row) => (
          <div role="row" key={row.id}>
            <span role="cell">{row.title}</span>
            <span role="cell">{row.status}</span>
            <span role="cell">{row.dueDate}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return <TaskTable rows={allRows} />;
}
