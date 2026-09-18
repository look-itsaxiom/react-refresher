import { StrictMode, useState } from 'react';

type Entry = { id: number; at: number };

// Module-level, shared across every render of every instance.
const log: Entry[] = [];

function LogPanel() {
  const [, setTick] = useState(0);

  function addEntry() {
    // Side effects belong in event handlers, which StrictMode never double-invokes,
    // not in the render body, which it does.
    log.push({ id: log.length, at: Date.now() });
    setTick((t) => t + 1);
  }

  return (
    <div>
      <p data-testid="entry-count">{log.length}</p>
      <button onClick={addEntry}>Add entry</button>
    </div>
  );
}

export default function App() {
  return (
    <StrictMode>
      <LogPanel />
    </StrictMode>
  );
}
