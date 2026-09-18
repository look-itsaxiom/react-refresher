export type Item = {
  id: string;
  category: string;
  score: number;
};

export function groupByCategory(items: Item[]): Partial<Record<string, Item[]>> {
  return Object.groupBy(items, (item) => item.category);
}

export function topN(items: Item[], n: number): Item[] {
  return items.toSorted((a, b) => b.score - a.score).slice(0, n);
}

export function uniqueTags(tagsA: string[], tagsB: string[]): string[] {
  const combined = new Set(tagsA).union(new Set(tagsB));
  return [...combined].sort();
}

export type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

export function makeDeferred<T>(): Deferred<T> {
  return Promise.withResolvers<T>();
}

const sample: Item[] = [
  { id: 'a', category: 'fruit', score: 3 },
  { id: 'b', category: 'veg', score: 5 },
  { id: 'c', category: 'fruit', score: 9 },
  { id: 'd', category: 'veg', score: 1 },
];

export default function App() {
  const grouped = groupByCategory(sample);
  const top = topN(sample, 2);
  const tags = uniqueTags(['sweet', 'tart'], ['tart', 'savory']);
  return (
    <div>
      <p>Categories: {Object.keys(grouped).join(', ')}</p>
      <p>Top 2 scores: {top.map((i) => i.score).join(', ')}</p>
      <p>Tags: {tags.join(', ')}</p>
    </div>
  );
}
