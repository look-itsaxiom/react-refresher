import { useState, useTransition } from 'react';

const allItems = Array.from({ length: 3000 }, (_, i) => `Widget #${i}`);

function findMatches(query: string): Promise<string[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const q = query.trim().toLowerCase();
      resolve(q ? allItems.filter((item) => item.toLowerCase().includes(q)) : allItems.slice(0, 25));
    }, 300);
  });
}

export default function App() {
  const [text, setText] = useState('');
  const [results, setResults] = useState<string[]>(() => allItems.slice(0, 25));
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string) {
    setText(next); // urgent: reflect every keystroke immediately

    startTransition(async () => {
      const matches = await findMatches(next);
      // Updates after an `await` need their own startTransition to stay non-urgent.
      startTransition(() => {
        setResults(matches);
      });
    });
  }

  return (
    <div>
      <input aria-label="Search widgets" value={text} onChange={(e) => handleChange(e.target.value)} />
      <ul data-pending={isPending ? 'true' : 'false'}>
        {results.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
