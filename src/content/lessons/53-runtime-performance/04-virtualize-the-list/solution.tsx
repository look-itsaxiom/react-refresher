import { useState } from 'react';

export type WindowInput = {
  itemCount: number;
  rowHeight: number;
  viewportHeight: number;
  scrollTop: number;
  overscan: number;
};

export type WindowResult = {
  start: number;
  end: number;
  offsetTop: number;
  totalHeight: number;
};

export function computeWindow({
  itemCount,
  rowHeight,
  viewportHeight,
  scrollTop,
  overscan,
}: WindowInput): WindowResult {
  const totalHeight = itemCount * rowHeight;

  if (itemCount <= 0 || rowHeight <= 0) {
    return { start: 0, end: 0, offsetTop: 0, totalHeight: Math.max(0, totalHeight) };
  }

  const safeScrollTop = Math.max(0, scrollTop);
  const firstVisible = Math.floor(safeScrollTop / rowHeight);
  const visibleCount = Math.max(1, Math.ceil(viewportHeight / rowHeight));
  const lastVisible = firstVisible + visibleCount - 1;

  const start = Math.max(0, Math.min(itemCount, firstVisible - overscan));
  const end = Math.max(start, Math.min(itemCount, lastVisible + overscan + 1));
  const offsetTop = start * rowHeight;

  return { start, end, offsetTop, totalHeight };
}

/** Provided — don't change. */
export const ITEM_COUNT = 1000;
/** Provided — don't change. */
export const ROW_HEIGHT = 40;
/** Provided — don't change. */
export const VIEWPORT_HEIGHT = 400;
/** Provided — don't change. */
export const OVERSCAN = 3;

const ITEMS = Array.from({ length: ITEM_COUNT }, (_, i) => `Row ${i}`);

export default function VirtualList() {
  const [scrollTop, setScrollTop] = useState(0);

  const { start, end, offsetTop, totalHeight } = computeWindow({
    itemCount: ITEM_COUNT,
    rowHeight: ROW_HEIGHT,
    viewportHeight: VIEWPORT_HEIGHT,
    scrollTop,
    overscan: OVERSCAN,
  });
  const visible = ITEMS.slice(start, end);

  return (
    <div
      data-testid="viewport"
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      style={{ height: VIEWPORT_HEIGHT, overflow: 'auto', position: 'relative' }}
    >
      <div data-testid="spacer" style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ position: 'absolute', top: offsetTop, left: 0, right: 0 }}>
          {visible.map((label, i) => {
            const index = start + i;
            return (
              <div key={index} data-testid={`row-${index}`} style={{ height: ROW_HEIGHT }}>
                {label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
