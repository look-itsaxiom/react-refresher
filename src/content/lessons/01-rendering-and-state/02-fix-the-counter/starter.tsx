import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  function handleTriple() {
    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1);
  }

  function handleDelayed() {
    setTimeout(() => {
      setCount(count + 1);
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
