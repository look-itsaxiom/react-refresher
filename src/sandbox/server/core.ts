import type { ServerControls } from '../../content/types';

export const DEFAULT_LATENCY_MS = 600;

let latencyMs = DEFAULT_LATENCY_MS;
let pendingFailure: string | null = null;
const resetters: Array<() => void> = [];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Run `fn` "on the server": after artificial latency, honoring a one-shot forced failure. */
export async function serverCall<T>(fn: () => T): Promise<T> {
  await sleep(latencyMs);
  if (pendingFailure !== null) {
    const message = pendingFailure;
    pendingFailure = null;
    throw new Error(message);
  }
  return fn();
}

/** Register a function that restores a server module's in-memory state. */
export function onReset(fn: () => void): void {
  resetters.push(fn);
}

export const controls: ServerControls = {
  reset() {
    latencyMs = DEFAULT_LATENCY_MS;
    pendingFailure = null;
    for (const fn of resetters) fn();
  },
  setLatency(ms) {
    latencyMs = Math.max(0, ms);
  },
  failNext(message = 'The server returned an error') {
    pendingFailure = message;
  },
};
