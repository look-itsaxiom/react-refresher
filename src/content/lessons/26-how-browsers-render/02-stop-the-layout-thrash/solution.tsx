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

export function positionItems(layout: LayoutRecorder, count: number): number[] {
  const currents: number[] = [];
  for (let i = 0; i < count; i++) {
    currents.push(layout.read(i));
  }
  const next = currents.map((current) => current + 4);
  next.forEach((value, i) => layout.write(i, value));
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
