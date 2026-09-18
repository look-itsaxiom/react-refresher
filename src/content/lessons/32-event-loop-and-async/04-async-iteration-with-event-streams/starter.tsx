import { useEffect, useState } from 'react';

export type EventStream<T> = {
  push(value: T): void;
  close(): void;
  readonly consumers: number;
  [Symbol.asyncIterator](): AsyncIterator<T>;
};

// TODO: push() should hand a value straight to a consumer that's already waiting on
// `next()`, or queue it if nobody's waiting yet — values pushed before consumption starts
// must still arrive, in order, once it does. close() should end any *future* iteration,
// including resolving a consumer that's currently blocked waiting for the next value
// (right now nothing ever wakes such a consumer up). `consumers` should track how many
// async iterators are currently subscribed, going back down when one exits via close() or
// via `.return()` — right now it's stuck at 0, so nothing ever notices a leaked subscriber.
export function createEventStream<T>(): EventStream<T> {
  const queue: T[] = [];
  let closed = false;
  return {
    push(value) {
      if (!closed) queue.push(value);
    },
    close() {
      closed = true;
    },
    consumers: 0,
    async *[Symbol.asyncIterator]() {
      while (true) {
        if (queue.length > 0) {
          yield queue.shift()!;
        } else if (closed) {
          return;
        } else {
          // Broken stand-in for "wait for the next push": polls instead of being woken up,
          // and much too slowly to ever look responsive.
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }
    },
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
