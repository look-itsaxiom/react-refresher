import { useCallback, useMemo, useState } from 'react';

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

  // Unnecessary manual memoization: this handler has no dependency that ever changes
  // identity in a way that matters here, and nothing downstream needs a stable
  // reference to it.
  const handleQueryChange = useCallback((value: string) => setQuery(value), []);

  // BUG: this reads `tag` but only lists `query` as a dependency. Changing the
  // category filter alone won't recompute `filtered` until `query` also changes.
  const filtered = useMemo(
    () =>
      ITEMS.filter(
        (item) => item.name.toLowerCase().includes(query.toLowerCase()) && (tag === 'all' || item.tag === tag),
      ),
    [query],
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
