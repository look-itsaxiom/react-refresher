import { useDeferredValue, useMemo, useState } from 'react';
import { rows as allRows, type Status, type TaskRow } from './data';

type SortKey = 'title' | 'status' | 'dueDate';
type SortDir = 'asc' | 'desc';

const ROW_HEIGHT = 32;
const VIEWPORT_HEIGHT = 400;
const VISIBLE_ROWS = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT);
const OVERSCAN = 5;

function compare(a: TaskRow, b: TaskRow, key: SortKey): number {
  return a[key].localeCompare(b[key]);
}

export function TaskTable({ rows }: { rows: TaskRow[] }) {
  const [filter, setFilter] = useState('');
  const deferredFilter = useDeferredValue(filter);
  const [sortKey, setSortKey] = useState<SortKey>('title');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [scrollTop, setScrollTop] = useState(0);

  const filtered = useMemo(() => {
    const q = deferredFilter.trim().toLowerCase();
    const base = q ? rows.filter((r) => r.title.toLowerCase().includes(q)) : rows;
    return [...base].sort((a, b) => (sortDir === 'asc' ? compare(a, b, sortKey) : -compare(a, b, sortKey)));
  }, [rows, deferredFilter, sortKey, sortDir]);

  const counts = useMemo(() => {
    const c: Record<Status, number> = { todo: 0, 'in-progress': 0, done: 0 };
    for (const r of filtered) c[r.status]++;
    return c;
  }, [filtered]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function ariaSortFor(key: SortKey): 'ascending' | 'descending' | 'none' {
    if (key !== sortKey) return 'none';
    return sortDir === 'asc' ? 'ascending' : 'descending';
  }

  const total = filtered.length;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(total, startIndex + VISIBLE_ROWS + OVERSCAN * 2);
  const visible = filtered.slice(startIndex, endIndex);
  const topPad = startIndex * ROW_HEIGHT;
  const bottomPad = (total - endIndex) * ROW_HEIGHT;

  return (
    <div>
      <label>
        Filter by title{' '}
        <input aria-label="Filter by title" value={filter} onChange={(e) => setFilter(e.target.value)} />
      </label>
      <p>
        {total} tasks — {counts.todo} to do, {counts['in-progress']} in progress, {counts.done} done
      </p>
      <div
        role="table"
        aria-label="Tasks"
        style={{ height: VIEWPORT_HEIGHT, overflowY: 'auto' }}
        onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
      >
        <div role="row" style={{ display: 'flex' }}>
          <button type="button" role="columnheader" aria-sort={ariaSortFor('title')} onClick={() => toggleSort('title')}>
            Title
          </button>
          <button type="button" role="columnheader" aria-sort={ariaSortFor('status')} onClick={() => toggleSort('status')}>
            Status
          </button>
          <button type="button" role="columnheader" aria-sort={ariaSortFor('dueDate')} onClick={() => toggleSort('dueDate')}>
            Due date
          </button>
        </div>
        {total === 0 ? (
          <p>No tasks match "{filter}"</p>
        ) : (
          <>
            <div style={{ height: topPad }} />
            {visible.map((row) => (
              <div role="row" key={row.id} style={{ height: ROW_HEIGHT, display: 'flex' }}>
                <span role="cell">{row.title}</span>
                <span role="cell">{row.status}</span>
                <span role="cell">{row.dueDate}</span>
              </div>
            ))}
            <div style={{ height: bottomPad }} />
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return <TaskTable rows={allRows} />;
}
