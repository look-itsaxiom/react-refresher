import { useState } from 'react';

/**
 * Simulates a chunk of heavy synchronous work — a real busy loop, not a fake delay.
 * Provided — don't change, and don't call it anywhere except once per chunk in the loop
 * below.
 */
export function crunch(data: number[]): number {
  let total = 0;
  for (let i = 0; i < data.length; i++) {
    const value = data[i]!;
    for (let j = 0; j < 40000; j++) {
      total += (value * j) % 7;
    }
  }
  return total;
}

/** Splits `data` into arrays of at most `size` items, in order. Provided — don't change. */
export function chunked<T>(data: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < data.length; i += size) {
    chunks.push(data.slice(i, i + size));
  }
  return chunks;
}

/** How many times `yieldToMain` has actually yielded. Provided — inspect, don't reset. */
export let yieldCount = 0;

/**
 * Yields to the event loop and resolves on a new task: `scheduler.yield()` where it
 * exists, a `setTimeout` fallback where it doesn't. Provided — call it, don't reimplement
 * it.
 */
export function yieldToMain(): Promise<void> {
  yieldCount++;
  const sched = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  if (sched && typeof sched.yield === 'function') {
    return sched.yield();
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

const DATA = Array.from({ length: 20 }, (_, i) => i);
const CHUNK_SIZE = 4;

// TODO: this shows "Saved" the instant the work finishes, with no pending state ever
// visible along the way — the button jumps straight from "Save" to "Saved" because
// nothing yields between setting `pending` and running the heavy work, so React never
// gets a chance to paint the pending frame first.
export default function SaveButton() {
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleClick() {
    setSaved(false);
    setPending(true);
    let total = 0;
    for (const chunk of chunked(DATA, CHUNK_SIZE)) {
      total += crunch(chunk);
    }
    void total;
    setSaved(true);
    setPending(false);
  }

  return (
    <button onClick={handleClick} disabled={pending} aria-busy={pending}>
      {pending ? 'Saving…' : saved ? 'Saved' : 'Save'}
    </button>
  );
}
