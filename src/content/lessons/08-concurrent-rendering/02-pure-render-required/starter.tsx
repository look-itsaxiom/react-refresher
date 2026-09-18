import { StrictMode, useState } from 'react';

type Entry = { id: number; at: number };

// Module-level, shared across every render of every instance.
const log: Entry[] = [];

function LogPanel() {
  const [, setTick] = useState(0);

  // BUG: this mutates `log` and reads `Date.now()` directly in the render body.
  // Render bodies must be pure — they can run more than once per commit.
  log.push({ id: log.length, at: Date.now() });

  return (
    <div>
      <p data-testid="entry-count">{log.length}</p>
      <button onClick={() => setTick((t) => t + 1)}>Add entry</button>
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
