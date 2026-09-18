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

// TODO: retry `fn` with exponential backoff + jitter, capped by `maxDelayMs`, up to
// `options.retries` extra attempts. Never retry a ClientError. Reject immediately with an
// AbortError if `options.signal` is (or becomes) aborted.
export async function fetchWithRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  return fn();
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
