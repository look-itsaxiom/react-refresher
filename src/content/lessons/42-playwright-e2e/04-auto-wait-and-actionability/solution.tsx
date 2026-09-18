import { useEffect, useState } from 'react';

export type FakeClock = { now(): number; sleep(ms: number): Promise<void> };
export type IsVisible = (el: Element) => boolean;

export async function expectEventually(
  predicate: () => true | string,
  opts: { timeout: number; interval: number; clock: FakeClock },
): Promise<void> {
  const start = opts.clock.now();
  let lastMessage = 'predicate never ran';

  while (true) {
    const result = predicate();
    if (result === true) return;
    lastMessage = result;
    if (opts.clock.now() - start >= opts.timeout) {
      throw new Error(`timed out after ${opts.timeout}ms: ${lastMessage}`);
    }
    await opts.clock.sleep(opts.interval);
  }
}

export async function actionable(
  el: Element,
  clock: FakeClock,
  isVisible: IsVisible,
  opts: { timeout?: number; interval?: number } = {},
): Promise<Element> {
  const timeout = opts.timeout ?? 2000;
  const interval = opts.interval ?? 50;
  let lastPosition: string | null = null;
  let polled = false;

  await expectEventually(
    () => {
      const visible = isVisible(el);
      const enabled = !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true';
      const position = el.getAttribute('data-position');
      const stable = polled && position === lastPosition;
      polled = true;
      lastPosition = position;
      if (visible && enabled && stable) return true;
      const failures = [
        !visible && 'not visible',
        !enabled && 'not enabled',
        !stable && 'not stable',
      ].filter(Boolean);
      return `element is ${failures.join(', ')}`;
    },
    { timeout, interval, clock },
  );

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
