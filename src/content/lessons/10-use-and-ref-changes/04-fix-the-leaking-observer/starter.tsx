import { useState } from 'react';

/** Stand-in for a real observer API (ResizeObserver, IntersectionObserver, ...). */
export class FakeObserver {
  static activeCount = 0;

  observe(_node: Element) {
    FakeObserver.activeCount++;
  }

  disconnect() {
    FakeObserver.activeCount--;
  }
}

function ResizeAware() {
  return (
    <div
      ref={(node) => {
        if (!node) return;
        const observer = new FakeObserver();
        observer.observe(node);
        // BUG: the observer is never disconnected.
      }}
    >
      Resizable panel
    </div>
  );
}

export default function App() {
  const [mounted, setMounted] = useState(true);
  return (
    <main>
      <button onClick={() => setMounted((m) => !m)}>{mounted ? 'Unmount panel' : 'Mount panel'}</button>
      {mounted && <ResizeAware />}
    </main>
  );
}
