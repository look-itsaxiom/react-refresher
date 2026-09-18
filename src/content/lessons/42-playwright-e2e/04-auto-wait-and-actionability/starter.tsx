import { useEffect, useState } from 'react';

export type FakeClock = { now(): number; sleep(ms: number): Promise<void> };
export type IsVisible = (el: Element) => boolean;

// TODO: resolve as soon as predicate() returns true; otherwise wait opts.interval via
// opts.clock.sleep(...) and try again, until opts.clock.now() has advanced opts.timeout ms since
// the start, then reject with an Error mentioning the last failure message. Right now this
// checks once and never retries or times out — the opposite of auto-waiting.
export async function expectEventually(
  predicate: () => true | string,
  _opts: { timeout: number; interval: number; clock: FakeClock },
): Promise<void> {
  const result = predicate();
  if (result !== true) {
    throw new Error(String(result));
  }
}

// TODO: poll until el is visible (isVisible(el)), enabled (no disabled attribute, aria-disabled
// isn't "true"), and stable (data-position unchanged since the last poll) — all three, via
// expectEventually or your own loop against clock. Right now it returns immediately without
// checking anything.
export async function actionable(
  el: Element,
  _clock: FakeClock,
  _isVisible: IsVisible,
  _opts: { timeout?: number; interval?: number } = {},
): Promise<Element> {
  return el;
}

export default function App() {
  const [enabled, setEnabled] = useState(false);
  const [position, setPosition] = useState(0);

  useEffect(() => {
    const settle = setTimeout(() => setEnabled(true), 1000);
    const move = setInterval(() => setPosition((p) => (p < 3 ? p + 1 : p)), 250);
    return () => {
      clearTimeout(settle);
      clearInterval(move);
    };
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <button disabled={!enabled} data-position={position} style={{ transform: `translateX(${position * 8}px)` }}>
        {enabled ? 'Ready' : 'Settling…'}
      </button>
    </div>
  );
}
