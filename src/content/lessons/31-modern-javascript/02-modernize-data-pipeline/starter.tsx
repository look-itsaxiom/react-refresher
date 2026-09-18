export type Item = {
  id: string;
  category: string;
  score: number;
};

// TODO: replace this manual loop + hasOwnProperty guard with `Object.groupBy`.
export function groupByCategory(items: Item[]): Partial<Record<string, Item[]>> {
  const groups: Partial<Record<string, Item[]>> = {};
  for (const item of items) {
    if (!Object.prototype.hasOwnProperty.call(groups, item.category)) {
      groups[item.category] = [];
    }
    groups[item.category]!.push(item);
  }
  return groups;
}

// TODO: this mutates the caller's array in place (`.sort()` sorts and returns the same
// array it's called on) — replace it with the non-mutating `.toSorted()`.
export function topN(items: Item[], n: number): Item[] {
  return items.sort((a, b) => b.score - a.score).slice(0, n);
}

// TODO: replace the manual dedupe loop with Set methods (`new Set(...).union(...)`).
export function uniqueTags(tagsA: string[], tagsB: string[]): string[] {
  const seen: string[] = [];
  for (const tag of [...tagsA, ...tagsB]) {
    if (seen.indexOf(tag) === -1) {
      seen.push(tag);
    }
  }
  return seen.sort();
}

export type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

// TODO: replace the captured-callback pattern with `Promise.withResolvers()`.
export function makeDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
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
