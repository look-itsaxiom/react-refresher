import type { Check } from '../../../types';

type WindowInput = {
  itemCount: number;
  rowHeight: number;
  viewportHeight: number;
  scrollTop: number;
  overscan: number;
};
type WindowResult = { start: number; end: number; offsetTop: number; totalHeight: number };

export const checks: Check[] = [
  {
    name: 'computeWindow: empty list returns an empty, zero-height window',
    run: async ({ mod, expect }) => {
      const computeWindow = mod.computeWindow as (input: WindowInput) => WindowResult;
      const result = computeWindow({ itemCount: 0, rowHeight: 40, viewportHeight: 400, scrollTop: 0, overscan: 3 });
      expect(result).to.deep.equal({ start: 0, end: 0, offsetTop: 0, totalHeight: 0 });
    },
  },
  {
    name: 'computeWindow: at the top, start clamps to 0 instead of going negative',
    run: async ({ mod, expect }) => {
      const computeWindow = mod.computeWindow as (input: WindowInput) => WindowResult;
      const result = computeWindow({ itemCount: 1000, rowHeight: 40, viewportHeight: 400, scrollTop: 0, overscan: 3 });
      expect(result.start).to.equal(0);
      expect(result.offsetTop).to.equal(0);
      expect(result.totalHeight).to.equal(40000);
      // 10 fully visible rows (400 / 40) plus overscan below (none available above at the top).
      expect(result.end).to.be.at.most(13);
      expect(result.end).to.be.at.least(10);
    },
  },
  {
    name: 'computeWindow: at the bottom, end clamps to itemCount instead of overshooting',
    run: async ({ mod, expect }) => {
      const computeWindow = mod.computeWindow as (input: WindowInput) => WindowResult;
      const result = computeWindow({
        itemCount: 1000,
        rowHeight: 40,
        viewportHeight: 400,
        scrollTop: 1000 * 40 - 400, // scrolled all the way to the last row
        overscan: 3,
      });
      expect(result.end).to.equal(1000);
      expect(result.start).to.be.at.least(1000 - 13);
      expect(result.totalHeight).to.equal(40000);
    },
  },
  {
    name: 'computeWindow: mid-list, the window is centered on scrollTop with overscan on both sides',
    run: async ({ mod, expect }) => {
      const computeWindow = mod.computeWindow as (input: WindowInput) => WindowResult;
      // scrollTop of 4000 puts row 100 at the top of the viewport.
      const result = computeWindow({ itemCount: 1000, rowHeight: 40, viewportHeight: 400, scrollTop: 4000, overscan: 3 });
      expect(result.start).to.equal(97);
      expect(result.end).to.equal(113);
      expect(result.offsetTop).to.equal(97 * 40);
    },
  },
  {
    name: 'initial render mounts a bounded number of rows, not all 1,000',
    run: async ({ render, screen, act, expect, Component }) => {
      await act(async () => {
        render(<Component />);
      });
      const viewport = screen.getByTestId('viewport');
      const rows = viewport.querySelectorAll('[data-testid^="row-"]');
      // 10 visible rows + up to 2 * 3 overscan = 16, generously.
      expect(rows.length).to.be.at.most(16);
      expect(rows.length).to.be.at.least(10);
      expect(screen.queryByTestId('row-999')).to.equal(null);
    },
  },
  {
    name: 'the spacer reports the full scrollable height regardless of how few rows are mounted',
    run: async ({ render, screen, act, expect, Component }) => {
      await act(async () => {
        render(<Component />);
      });
      const spacer = screen.getByTestId('spacer') as HTMLElement;
      expect(spacer.style.height).to.equal('40000px');
    },
  },
  {
    name: 'scrolling down mounts the rows now in view and unmounts the ones that scrolled away',
    run: async ({ render, screen, act, expect, Component }) => {
      await act(async () => {
        render(<Component />);
      });
      const viewport = screen.getByTestId('viewport') as HTMLElement;

      expect(screen.getByTestId('row-0')).to.exist;
      expect(screen.queryByTestId('row-500')).to.equal(null);

      await act(async () => {
        viewport.scrollTop = 500 * 40; // scroll so row 500 is at the top of the viewport
        viewport.dispatchEvent(new Event('scroll', { bubbles: true }));
      });

      expect(screen.getByTestId('row-500'), 'row 500 should now be mounted').to.exist;
      expect(screen.queryByTestId('row-0'), 'row 0 should have scrolled out of the window').to.equal(null);
      const rows = viewport.querySelectorAll('[data-testid^="row-"]');
      expect(rows.length).to.be.at.most(16);
    },
  },
];
