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

export function* paginate<T>(source: Iterable<T>, size: number): Generator<T[]> {
  // Deliberately not `it.take(size).toArray()` in a loop: an iterator helper's `.take()`
  // closes the underlying iterator once its own count is exhausted (the call that
  // reports `done` calls `.return()` on the source), so a second `.take()` on the same
  // `it` would find it already closed. Pulling with plain `.next()` calls has no such
  // side effect and resumes exactly where the last page left off.
  const it = source[Symbol.iterator]();
  while (true) {
    const page: T[] = [];
    for (let i = 0; i < size; i++) {
      const { value, done } = it.next();
      if (done) break;
      page.push(value);
    }
    if (page.length === 0) return;
    yield page;
    if (page.length < size) return;
  }
}

export function pluck<T, K extends keyof T>(source: Iterable<T>, key: K): Iterator<T[K]> {
  return Iterator.from(source).map((item) => item[key]);
}

export function PagedList() {
  const [shown, setShown] = useState<Person[]>([]);
  const [finished, setFinished] = useState(false);
  const generatorRef = useRef<Generator<Person[]> | null>(null);

  function loadMore() {
    if (!generatorRef.current) {
      generatorRef.current = paginate(people, PAGE_SIZE);
    }
    const { value, done } = generatorRef.current.next();
    if (done) {
      setFinished(true);
      return;
    }
    setShown((prev) => [...prev, ...value]);
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
