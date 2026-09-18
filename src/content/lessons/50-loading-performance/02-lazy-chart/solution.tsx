import { lazy, Suspense, startTransition, useState } from 'react';

type Tab = 'overview' | 'chart';

function Overview() {
  return (
    <div>
      <h2>Overview</h2>
      <p>Everything looks fine.</p>
    </div>
  );
}

// Keep the loader function around so the tab button's onMouseEnter can call it directly
// to warm the chunk, independent of whether `lazy()` has decided to render it yet.
const loadChart = () => import('./Chart');
const Chart = lazy(loadChart);

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  return (
    <main>
      <h1>Dashboard</h1>
      <nav>
        <button type="button" onClick={() => startTransition(() => setActiveTab('overview'))}>
          Overview
        </button>
        <button
          type="button"
          onMouseEnter={() => {
            loadChart();
          }}
          onClick={() => startTransition(() => setActiveTab('chart'))}
        >
          Chart
        </button>
      </nav>
      <Suspense fallback={<p>Loading chart…</p>}>{activeTab === 'overview' ? <Overview /> : <Chart />}</Suspense>
    </main>
  );
}
