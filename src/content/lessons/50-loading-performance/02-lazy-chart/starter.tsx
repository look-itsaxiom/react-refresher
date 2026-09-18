import { useState } from 'react';
import Chart from './Chart';

type Tab = 'overview' | 'chart';

function Overview() {
  return (
    <div>
      <h2>Overview</h2>
      <p>Everything looks fine.</p>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  return (
    <main>
      <h1>Dashboard</h1>
      <nav>
        <button type="button" onClick={() => setActiveTab('overview')}>
          Overview
        </button>
        <button type="button" onClick={() => setActiveTab('chart')}>
          Chart
        </button>
      </nav>
      {activeTab === 'overview' ? <Overview /> : <Chart />}
    </main>
  );
}
