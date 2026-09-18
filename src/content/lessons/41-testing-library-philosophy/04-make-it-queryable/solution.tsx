import { useState } from 'react';

type Filter = 'all' | 'active' | 'done';
type Task = { id: number; label: string; done: boolean };

const ITEMS: Task[] = [
  { id: 1, label: 'Write report', done: false },
  { id: 2, label: 'Review PR', done: true },
  { id: 3, label: 'Ship release', done: false },
];

export default function FilterBar() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const results = ITEMS.filter((item) => {
    if (filter === 'active' && item.done) return false;
    if (filter === 'done' && !item.done) return false;
    return item.label.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <div className="filter-bar">
      <div role="search" className="search-row">
        <label htmlFor="task-search" className="sr-only">
          Search tasks
        </label>
        <input id="task-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="chips">
        <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
          All
        </button>
        <button type="button" aria-pressed={filter === 'active'} onClick={() => setFilter('active')}>
          Active
        </button>
        <button type="button" aria-pressed={filter === 'done'} onClick={() => setFilter('done')}>
          Done
        </button>
      </div>
      <p aria-live="polite">{results.length} results</p>
      <ul>
        {results.map((item) => (
          <li key={item.id}>{item.label}</li>
        ))}
      </ul>
    </div>
  );
}
