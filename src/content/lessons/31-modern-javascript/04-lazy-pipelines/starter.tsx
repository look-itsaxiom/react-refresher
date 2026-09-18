import { useRef, useState } from 'react';

export type Person = { id: string; name: string };

const people: Person[] = [
  { id: '1', name: 'Ada' },
  { id: '2', name: 'Grace' },
  { id: '3', name: 'Katherine' },
  { id: '4', name: 'Margaret' },
  { id: '5', name: 'Radia' },
  { id: '6', name: 'Barbara' },
  { id: '7', name: 'Frances' },
];

const PAGE_SIZE = 3;

// TODO: implement — see prompt.md. This placeholder is wrong on purpose: it eagerly
// spreads the whole source into one page, ignoring `size` entirely.
export function* paginate<T>(source: Iterable<T>, size: number): Generator<T[]> {
  void size;
  const all = [...source];
  if (all.length > 0) yield all;
}

// TODO: implement — see prompt.md. This placeholder is wrong on purpose: it eagerly
// materializes the whole source into an array before mapping it.
export function pluck<T, K extends keyof T>(source: Iterable<T>, key: K): Iterator<T[K]> {
  return [...source].map((item) => item[key])[Symbol.iterator]();
}

export function PagedList() {
  const [shown, setShown] = useState<Person[]>([]);
  const [finished, setFinished] = useState(false);
  const generatorRef = useRef<Generator<Person[]> | null>(null);

  function loadMore() {
    // TODO: lazily create the paginator on first click (store it in generatorRef), pull
    // the next page with `.next()`, and either append `value` to `shown` or, once
    // `done` is true, flip `finished`.
  }

  return (
    <div>
      <ul>
        {shown.map((person) => (
          <li key={person.id}>{person.name}</li>
        ))}
      </ul>
      <button onClick={loadMore} disabled={finished}>
        {finished ? 'No more' : 'Load more'}
      </button>
    </div>
  );
}

export default function App() {
  return <PagedList />;
}

// unused reference so PAGE_SIZE isn't flagged before you wire it up
void PAGE_SIZE;
void people;
