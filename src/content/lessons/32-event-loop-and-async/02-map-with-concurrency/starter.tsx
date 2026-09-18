import { useState } from 'react';

export type ConcurrencyOptions = {
  limit: number;
  signal?: AbortSignal;
  settle?: boolean;
};

// TODO: never run more than `options.limit` calls to `fn` at once. Fail fast on the first
// rejection by default; with `settle: true`, run every item to completion and reject with
// an AggregateError of every failure instead. Reject immediately with a `name: 'AbortError'`
// error if `options.signal` is (or becomes) aborted, without waiting on in-flight work — but
// don't let discarded in-flight failures become unhandled rejections either.
export async function mapWithConcurrency<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  options: ConcurrencyOptions,
): Promise<R[]> {
  return Promise.all(items.map((item, index) => fn(item, index)));
}

/** Stands in for a slow network call: resolves with `id * 2` after `delayMs`. */
async function double(id: number, delayMs: number): Promise<number> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  return id * 2;
}

export default function App() {
  const [status, setStatus] = useState('idle');

  async function run() {
    setStatus('running…');
    try {
      const results = await mapWithConcurrency([1, 2, 3, 4, 5], (id) => double(id, 30), { limit: 2 });
      setStatus(`done: ${results.join(', ')}`);
    } catch (err) {
      setStatus(`failed: ${(err as Error).message}`);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <button onClick={run}>Run with limit 2</button>
      <p>{status}</p>
    </div>
  );
}
