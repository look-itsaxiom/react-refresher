import { memo, useDeferredValue, useMemo, useRef, useState, type ReactNode } from 'react';

type Row = { id: number; name: string; value: number };

const ROWS: Row[] = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  name: `Widget ${i}`,
  value: i * 7,
}));

function Chart({ data }: { data: Row[] }) {
  const renders = useRef(0);
  renders.current += 1;
  const total = data.reduce((sum, row) => sum + row.value, 0);
  return (
    <div data-testid="chart" data-renders={renders.current}>
      Total across {data.length} widgets: {total}
    </div>
  );
}

const Table = memo(function Table({ rows }: { rows: Row[] }) {
  const renders = useRef(0);
  renders.current += 1;
  return (
    <ul data-testid="table" data-renders={renders.current}>
      {rows.map((row) => (
        <li key={row.id}>{row.name}</li>
      ))}
    </ul>
  );
});

// FIX: this component owns the filter state, so it's the only thing that re-renders on
// every keystroke. `children` is an element `Dashboard` created exactly once and handed
// down — it keeps its identity across FilterPanel's re-renders, so React never re-renders
// Chart just because FilterPanel's own state changed.
function FilterPanel({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState('');
  // FIX: Table does need to react to the filter, but not on every single keystroke.
  // Deferring the value lets React coalesce rapid updates into fewer commits, while the
  // input itself (bound to `filter`, not `deferredFilter`) still updates every keystroke.
  const deferredFilter = useDeferredValue(filter);
  // FIX: memoize the filtered array on the deferred value, not the raw one — otherwise
  // `filtered` is a brand-new array reference on every render regardless, which would
  // defeat `Table`'s `React.memo` below just as surely as the original bug did.
  const filtered = useMemo(
    () => ROWS.filter((row) => row.name.toLowerCase().includes(deferredFilter.toLowerCase())),
    [deferredFilter],
  );

  return (
    <div>
      <input
        aria-label="Filter rows"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      {children}
      <Table rows={filtered} />
    </div>
  );
}

export default function Dashboard() {
  return (
    <FilterPanel>
      <Chart data={ROWS} />
    </FilterPanel>
  );
}
