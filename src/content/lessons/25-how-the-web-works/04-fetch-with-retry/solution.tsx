import { useState } from 'react';
import { fetchUser, type User } from '@server/users';

/** Stands in for a 4xx: retrying this can never succeed. */
export class ClientError extends Error {}

/** How many times `request` has actually been called, across every attempt. */
export const attempts = { count: 0 };

export async function request(id: number): Promise<User> {
  attempts.count += 1;
  if (id <= 0) {
    throw new ClientError(`Invalid user id: ${id}`);
  }
  return fetchUser(id);
}

export type RetryOptions = {
  retries: number;
  baseDelayMs: number;
  maxDelayMs?: number;
  signal?: AbortSignal;
};

function abortError(): DOMException {
  return new DOMException('Aborted', 'AbortError');
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(abortError());
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export async function fetchWithRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const { retries, baseDelayMs, maxDelayMs = Infinity, signal } = options;
  let attempt = 0;

  while (true) {
    if (signal?.aborted) throw abortError();

    try {
      return await fn();
    } catch (err) {
      if (err instanceof ClientError) throw err;
      if (attempt >= retries) throw err;

      const exponential = baseDelayMs * 2 ** attempt;
      const capped = Math.min(exponential, maxDelayMs);
      const jittered = capped * (0.5 + Math.random() * 0.5); // 50%-100% of the capped delay
      await delay(jittered, signal);
      attempt += 1;
    }
  }
}

export default function App() {
  const [status, setStatus] = useState('idle');

  async function run() {
    setStatus('loading…');
    try {
      const user = await fetchWithRetry(() => request(1), { retries: 3, baseDelayMs: 200 });
      setStatus(`loaded: ${user.name}`);
    } catch (err) {
      setStatus(`failed: ${(err as Error).message}`);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <button onClick={run}>Fetch user 1</button>
      <p>{status}</p>
      <p>attempts so far: {attempts.count}</p>
    </div>
  );
}
