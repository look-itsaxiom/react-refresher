import { useRef, useState } from 'react';

type Row = { id: number; name: string; value: number };

const ROWS: Row[] = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  name: `Widget ${i}`,
  value: i * 7,
}));

// Pretend this does real work: drawing a chart, computing aggregates, whatever makes a
// re-render actually cost something. It always summarizes the FULL data set — it never
// reads the filter text.
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

function Table({ rows }: { rows: Row[] }) {
  const renders = useRef(0);
  renders.current += 1;
  return (
    <ul data-testid="table" data-renders={renders.current}>
      {rows.map((row) => (
        <li key={row.id}>{row.name}</li>
      ))}
    </ul>
  );
}

export default function Dashboard() {
  // BUG: this state lives here, so every keystroke re-renders Dashboard, which
  // re-renders Chart and Table too — even though Chart never looks at `filter`.
  const [filter, setFilter] = useState('');
  const filtered = ROWS.filter((row) => row.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div>
      <input
        aria-label="Filter rows"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <Chart data={ROWS} />
      <Table rows={filtered} />
    </div>
  );
}
