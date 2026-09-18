import type { Check } from '../../../types';

type LayoutRecorder = {
  read(index: number): number;
  write(index: number, value: number): void;
  forcedLayouts: number;
  log: Array<{ op: 'read' | 'write'; index: number }>;
};

export const checks: Check[] = [
  {
    name: 'positionItems still returns each item nudged 4px past its current position',
    run: async ({ mod, expect }) => {
      const createLayout = mod.createLayout as () => LayoutRecorder;
      const positionItems = mod.positionItems as (layout: LayoutRecorder, count: number) => number[];
      const layout = createLayout();
      const result = positionItems(layout, 20);
      const expected = Array.from({ length: 20 }, (_, i) => i * 40 + 4);
      expect(result).to.deep.equal(expected);
    },
  },
  {
    name: 'reads are batched before writes: forcedLayouts stays at 1 or less for 20 items',
    run: async ({ mod, expect }) => {
      const createLayout = mod.createLayout as () => LayoutRecorder;
      const positionItems = mod.positionItems as (layout: LayoutRecorder, count: number) => number[];
      const layout = createLayout();
      positionItems(layout, 20);
      expect(layout.forcedLayouts).to.be.at.most(1);
    },
  },
  {
    name: 'every read happens before every write, in the operation log',
    run: async ({ mod, expect }) => {
      const createLayout = mod.createLayout as () => LayoutRecorder;
      const positionItems = mod.positionItems as (layout: LayoutRecorder, count: number) => number[];
      const layout = createLayout();
      positionItems(layout, 20);
      const firstWriteIndex = layout.log.findIndex((entry) => entry.op === 'write');
      const lastReadIndex = layout.log.reduce(
        (last, entry, i) => (entry.op === 'read' ? i : last),
        -1,
      );
      expect(firstWriteIndex).to.be.greaterThan(-1);
      expect(lastReadIndex).to.be.lessThan(firstWriteIndex);
    },
  },
  {
    name: 'the rendered list shows the forced-layout count and all 20 positioned items',
    run: async ({ render, screen, expect, act, Component }) => {
      await act(async () => {
        render(<Component />);
      });
      expect(screen.getByTestId('forced-layouts').textContent).to.equal('Forced layouts: 0');
      expect(screen.getByTestId('item-0')).to.exist;
      expect(screen.getByTestId('item-19')).to.exist;
    },
  },
];
