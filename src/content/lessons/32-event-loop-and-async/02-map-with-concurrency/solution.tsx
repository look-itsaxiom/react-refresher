import { useState } from 'react';

export type ConcurrencyOptions = {
  limit: number;
  signal?: AbortSignal;
  settle?: boolean;
};

export async function mapWithConcurrency<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  options: ConcurrencyOptions,
): Promise<R[]> {
  const { limit, signal, settle } = options;

  return new Promise<R[]>((resolve, reject) => {
    const results: R[] = new Array(items.length);
    const errors: unknown[] = new Array(items.length);
    let hasErrors = false;
    let nextIndex = 0;
    let finishedWorkers = 0;
    let settledOutcome = false;
    let aborted = false;

    const finishOutcome = (fn: () => void) => {
      if (settledOutcome) return;
      settledOutcome = true;
      signal?.removeEventListener('abort', onAbort);
      fn();
    };

    function onAbort() {
      aborted = true;
      finishOutcome(() => reject(makeAbortError()));
    }

    if (items.length === 0) {
      resolve([]);
      return;
    }

    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener('abort', onAbort);

    const workerCount = Math.min(limit, items.length);

    async function worker() {
      while (true) {
        if (aborted || settledOutcome) return;
        const index = nextIndex++;
        if (index >= items.length) return;
        try {
          results[index] = await fn(items[index]!, index);
        } catch (err) {
          if (settle) {
            errors[index] = err;
            hasErrors = true;
          } else if (!settledOutcome && !aborted) {
            finishOutcome(() => reject(err));
          }
          // A non-settle rejection after the outcome is already settled (fail-fast already
          // fired, or an abort beat it) is intentionally swallowed here — the caller no
          // longer cares about it, but it must not become an unhandled rejection.
        }
      }
    }

    const workers: Promise<void>[] = [];
    for (let i = 0; i < workerCount; i++) workers.push(worker());

    Promise.allSettled(workers).then(() => {
      finishedWorkers = workers.length;
      void finishedWorkers; // only used for clarity while reading; not asserted on
      finishOutcome(() => {
        if (hasErrors) {
          reject(new AggregateError(errors.filter((e) => e !== undefined), 'mapWithConcurrency: one or more items failed'));
        } else {
          resolve(results);
        }
      });
    });
  });
}

function makeAbortError(): Error {
  return new DOMException('Aborted', 'AbortError');
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
