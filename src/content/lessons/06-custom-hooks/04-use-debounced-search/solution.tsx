import { useEffect, useState } from 'react';

const FRUIT = ['Apple', 'Apricot', 'Banana', 'Blueberry', 'Cherry', 'Cranberry', 'Date', 'Grape', 'Kiwi', 'Mango'];

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export default function App() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);
  const filtered = FRUIT.filter((item) => item.toLowerCase().includes(debouncedQuery.toLowerCase()));

  return (
    <div>
      <input aria-label="Search fruit" value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul>
        {filtered.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
