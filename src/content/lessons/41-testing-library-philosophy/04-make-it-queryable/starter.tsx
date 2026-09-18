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
      <div className="search-row">
        <div className="search-icon">🔍</div>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" />
      </div>
      <div className="chips">
        <div className={`chip ${filter === 'all' ? 'chip-selected' : ''}`} onClick={() => setFilter('all')}>
          All
        </div>
        <div className={`chip ${filter === 'active' ? 'chip-selected' : ''}`} onClick={() => setFilter('active')}>
          Active
        </div>
        <div className={`chip ${filter === 'done' ? 'chip-selected' : ''}`} onClick={() => setFilter('done')}>
          Done
        </div>
      </div>
      <div className="count">{results.length} results</div>
      <ul>
        {results.map((item) => (
          <li key={item.id}>{item.label}</li>
        ))}
      </ul>
    </div>
  );
}
