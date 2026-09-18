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

// TODO: this always renders the whole list, ignoring scrollTop and overscan entirely.
// Return only the range of indices that's actually visible (plus overscan on each side),
// clamped to [0, itemCount], with the matching offsetTop and totalHeight.
export function computeWindow({ itemCount, rowHeight }: WindowInput): WindowResult {
  return {
    start: 0,
    end: itemCount,
    offsetTop: 0,
    totalHeight: itemCount * rowHeight,
  };
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
