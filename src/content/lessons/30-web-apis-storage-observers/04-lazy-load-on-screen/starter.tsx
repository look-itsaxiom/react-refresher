import { useEffect, useRef, useState, type RefObject } from 'react';

type FakeEntry = { target: Element; isIntersecting: boolean };
type FakeCallback = (entries: FakeEntry[]) => void;

/**
 * Stand-in for the real IntersectionObserver, installed on `globalThis` only when the
 * real one isn't available (this sandbox's jsdom check runner). In a browser, the real
 * IntersectionObserver is used instead and this class is never touched.
 */
class FakeIntersectionObserver {
  static activeCount = 0;
  private static instances: FakeIntersectionObserver[] = [];
  private observed = new Set<Element>();
  private callback: FakeCallback;

  constructor(callback: FakeCallback) {
    this.callback = callback;
    FakeIntersectionObserver.instances.push(this);
  }

  observe(target: Element) {
    this.observed.add(target);
    FakeIntersectionObserver.activeCount++;
  }

  unobserve(target: Element) {
    if (this.observed.delete(target)) FakeIntersectionObserver.activeCount--;
  }

  disconnect() {
    FakeIntersectionObserver.activeCount -= this.observed.size;
    this.observed.clear();
  }

  /** Test/demo helper: deliver entries to whichever instance is observing each target. */
  static trigger(entries: FakeEntry[]) {
    for (const instance of FakeIntersectionObserver.instances) {
      const matches = entries.filter((entry) => instance.observed.has(entry.target));
      if (matches.length > 0) instance.callback(matches);
    }
  }
}

if (!('IntersectionObserver' in globalThis)) {
  (globalThis as unknown as { IntersectionObserver: typeof FakeIntersectionObserver }).IntersectionObserver =
    FakeIntersectionObserver;
}

// BUG: always reports "on screen", so every row renders its full content immediately.
function useOnScreen(_ref: RefObject<Element | null>): boolean {
  return true;
}

const ROW_COUNT = 200;

function Row({ index }: { index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(ref);
  return (
    <div ref={ref} data-testid={`row-${index}`} data-onscreen={onScreen}>
      {onScreen ? (
        <span data-testid={`row-content-${index}`}>Row {index} — full content</span>
      ) : (
        <span data-testid={`row-placeholder-${index}`}>…</span>
      )}
    </div>
  );
}

export default function App() {
  const [mounted, setMounted] = useState(true);
  return (
    <main>
      <button onClick={() => setMounted((m) => !m)}>{mounted ? 'Unmount list' : 'Mount list'}</button>
      {mounted && (
        <ul>
          {Array.from({ length: ROW_COUNT }, (_, i) => (
            <li key={i}>
              <Row index={i} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
