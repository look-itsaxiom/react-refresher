import { useEffect, useState } from 'react';

export type EventStream<T> = {
  push(value: T): void;
  close(): void;
  readonly consumers: number;
  [Symbol.asyncIterator](): AsyncIterator<T>;
};

export function createEventStream<T>(): EventStream<T> {
  const queue: T[] = [];
  let waiting: ((result: IteratorResult<T>) => void) | null = null;
  let closed = false;
  let consumers = 0;

  function push(value: T): void {
    if (closed) return;
    if (waiting) {
      const resolve = waiting;
      waiting = null;
      resolve({ value, done: false });
    } else {
      queue.push(value);
    }
  }

  function close(): void {
    if (closed) return;
    closed = true;
    if (waiting) {
      const resolve = waiting;
      waiting = null;
      resolve({ value: undefined as unknown as T, done: true });
    }
  }

  function subscribe(): AsyncIterator<T> {
    consumers++;
    let done = false;
    return {
      async next(): Promise<IteratorResult<T>> {
        if (done) return { value: undefined as unknown as T, done: true };
        if (queue.length > 0) {
          return { value: queue.shift()!, done: false };
        }
        if (closed) {
          done = true;
          consumers--;
          return { value: undefined as unknown as T, done: true };
        }
        const result = await new Promise<IteratorResult<T>>((resolve) => {
          waiting = resolve;
        });
        if (result.done) {
          done = true;
          consumers--;
        }
        return result;
      },
      async return(value?: T): Promise<IteratorResult<T>> {
        if (!done) {
          done = true;
          consumers--;
        }
        return { value: value as T, done: true };
      },
    };
  }

  return {
    push,
    close,
    get consumers() {
      return consumers;
    },
    [Symbol.asyncIterator]: subscribe,
  };
}

export function Feed({ stream }: { stream: EventStream<string> }) {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    const iterator = stream[Symbol.asyncIterator]();
    let cancelled = false;

    (async () => {
      while (!cancelled) {
        const { value, done } = await iterator.next();
        if (done || cancelled) break;
        setItems((prev) => [...prev, value]);
      }
    })();

    return () => {
      cancelled = true;
      void iterator.return?.();
    };
  }, [stream]);

  return (
    <ul data-testid="feed">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export default function App() {
  const [stream] = useState(() => createEventStream<string>());
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: 16 }}>
      <button
        onClick={() => {
          const next = count + 1;
          setCount(next);
          stream.push(`event ${next}`);
        }}
      >
        Push value
      </button>
      <button onClick={() => stream.close()}>Close stream</button>
      <Feed stream={stream} />
    </div>
  );
}
