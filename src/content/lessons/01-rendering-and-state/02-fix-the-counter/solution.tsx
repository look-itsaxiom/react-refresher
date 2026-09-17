import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  function handleTriple() {
    // Updater functions read the latest queued value, not this render's snapshot.
    setCount((c) => c + 1);
    setCount((c) => c + 1);
    setCount((c) => c + 1);
  }

  function handleDelayed() {
    setTimeout(() => {
      // By the time this runs, `count` from the render that created the timer may be stale.
      setCount((c) => c + 1);
    }, 300);
  }

  return (
    <div>
      <p>
        Count: <output data-testid="count">{count}</output>
      </p>
      <button onClick={handleTriple}>+3</button>
      <button onClick={handleDelayed}>+1 in a moment</button>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  );
}
