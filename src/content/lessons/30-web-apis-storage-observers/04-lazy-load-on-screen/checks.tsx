import type { Check } from '../../../types';

type FakeEntry = { target: Element; isIntersecting: boolean };
type FakeIntersectionObserverLike = {
  trigger(entries: FakeEntry[]): void;
  activeCount: number;
};

function getFakeIntersectionObserver(): FakeIntersectionObserverLike {
  return (globalThis as unknown as { IntersectionObserver: FakeIntersectionObserverLike }).IntersectionObserver;
}

export const checks: Check[] = [
  {
    name: 'renders only placeholders before any row has been marked visible',
    run: async (ctx) => {
      const { render, screen, expect, Component } = ctx;
      render(<Component />);
      expect(screen.getByTestId('row-placeholder-0'), 'row 0 should start as a placeholder').to.exist;
      expect(screen.queryByTestId('row-content-0')).to.equal(null);
      expect(screen.getByTestId('row-placeholder-150'), 'row 150 should start as a placeholder').to.exist;
      expect(screen.queryByTestId('row-content-150')).to.equal(null);
    },
  },
  {
    name: 'triggering the observer for one row renders its full content, and only that row',
    run: async (ctx) => {
      const { render, screen, expect, act, Component } = ctx;
      render(<Component />);
      const target = screen.getByTestId('row-5');
      await act(async () => {
        getFakeIntersectionObserver().trigger([{ target, isIntersecting: true }]);
      });
      expect(screen.getByTestId('row-content-5'), 'row 5 should now show its full content').to.exist;
      expect(screen.queryByTestId('row-content-6'), 'row 6 was never triggered').to.equal(null);
      expect(screen.getByTestId('row-placeholder-6'), 'row 6 should still be a placeholder').to.exist;
    },
  },
  {
    name: 'disconnects every row observer once the list unmounts',
    run: async (ctx) => {
      const { render, screen, expect, act, Component } = ctx;
      const before = getFakeIntersectionObserver().activeCount;
      render(<Component />);
      const afterMount = getFakeIntersectionObserver().activeCount;
      expect(afterMount - before, 'one active observation per rendered row').to.equal(200);

      const unmountButton = screen.getByRole('button', { name: /unmount list/i });
      await act(async () => {
        unmountButton.click();
      });

      const afterUnmount = getFakeIntersectionObserver().activeCount;
      expect(afterUnmount, 'every row observer should be disconnected on unmount').to.equal(before);
    },
  },
];
