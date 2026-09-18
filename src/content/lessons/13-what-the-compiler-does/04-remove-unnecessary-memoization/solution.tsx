import { useMemo, useState } from 'react';

type Item = { id: number; name: string; tag: 'office' | 'kitchen' };

const ITEMS: Item[] = [
  { id: 1, name: 'Notebook', tag: 'office' },
  { id: 2, name: 'Espresso Machine', tag: 'kitchen' },
  { id: 3, name: 'Standing Desk', tag: 'office' },
  { id: 4, name: 'Blender', tag: 'kitchen' },
];

export default function FilteredList() {
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<'all' | 'office' | 'kitchen'>('all');

  // FIX: plain function, no useCallback. Nothing needed the stable identity.
  function handleQueryChange(value: string) {
    setQuery(value);
  }

  // FIX: `tag` is now part of the dependency array, so a category change recomputes
  // the list immediately.
  const filtered = useMemo(
    () =>
      ITEMS.filter(
        (item) => item.name.toLowerCase().includes(query.toLowerCase()) && (tag === 'all' || item.tag === tag),
      ),
    [query, tag],
  );

  return (
    <div>
      <input aria-label="Search" value={query} onChange={(e) => handleQueryChange(e.target.value)} />
      <select aria-label="Category" value={tag} onChange={(e) => setTag(e.target.value as typeof tag)}>
        <option value="all">All</option>
        <option value="office">Office</option>
        <option value="kitchen">Kitchen</option>
      </select>
      <ul data-testid="results">
        {filtered.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}
