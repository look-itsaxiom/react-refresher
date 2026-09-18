export type LayoutRecorder = {
  /** Reads item `index`'s current top offset, in px. */
  read(index: number): number;
  /** Writes item `index`'s new top offset, in px. */
  write(index: number, value: number): void;
  /** Incremented every time a `read` immediately follows a `write` — a forced layout. */
  forcedLayouts: number;
  /** Every operation, in the order it happened. */
  log: Array<{ op: 'read' | 'write'; index: number }>;
};

/**
 * A stand-in for the real DOM, since jsdom has no layout engine. Reading a position right
 * after writing one (without batching) is exactly as expensive here as it is for real:
 * every such read counts as a forced synchronous layout. Provided — don't change.
 */
export function createLayout(): LayoutRecorder {
  const positions = Array.from({ length: 64 }, (_, i) => i * 40);
  const log: Array<{ op: 'read' | 'write'; index: number }> = [];
  let lastOp: 'read' | 'write' | null = null;

  const layout: LayoutRecorder = {
    forcedLayouts: 0,
    log,
    read(index: number) {
      if (lastOp === 'write') layout.forcedLayouts++;
      lastOp = 'read';
      log.push({ op: 'read', index });
      return positions[index]!;
    },
    write(index: number, value: number) {
      lastOp = 'write';
      log.push({ op: 'write', index });
      positions[index] = value;
    },
  };
  return layout;
}

// TODO: this alternates read/write once per item, so every read after the first is a
// forced layout. Batch it: read every current position first, then write every new one.
export function positionItems(layout: LayoutRecorder, count: number): number[] {
  const next: number[] = [];
  for (let i = 0; i < count; i++) {
    const current = layout.read(i);
    const updated = current + 4;
    layout.write(i, updated);
    next.push(updated);
  }
  return next;
}

export default function App() {
  const layout = createLayout();
  const positions = positionItems(layout, 20);
  return (
    <div>
      <p data-testid="forced-layouts">Forced layouts: {layout.forcedLayouts}</p>
      <ul style={{ listStyle: 'none', padding: 0, position: 'relative' }}>
        {positions.map((top, i) => (
          <li key={i} data-testid={`item-${i}`} style={{ position: 'absolute', top }}>
            Item {i}
          </li>
        ))}
      </ul>
    </div>
  );
}
