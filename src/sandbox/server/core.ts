import type { ServerControls } from '../../content/types';

export const DEFAULT_LATENCY_MS = 600;

let latencyMs = DEFAULT_LATENCY_MS;
let pendingFailure: string | null = null;
const resetters: Array<() => void> = [];
/** Incremented on every reset; calls started under an older generation never settle. */
let generation = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run `fn` "on the server": after artificial latency, honoring a one-shot forced failure.
 * A call that is still in flight when `controls.reset()` runs (e.g. between two checks) is
 * stale: it still settles normally (React 19 entangles in-flight transitions, so a promise
 * that never settles would stall later form actions), but it may NOT consume a `failNext`
 * armed by the later check, which is what used to make failure checks flaky and produce
 * unhandled rejections into consumers that no longer exist.
 */
export async function serverCall<T>(fn: () => T): Promise<T> {
  const startedIn = generation;
  await sleep(latencyMs);
  const stale = startedIn !== generation;
  if (!stale && pendingFailure !== null) {
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
    generation++;
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
