import type { Check } from '../../../types';

type AnyStore = {
  getState: () => { count: number; label: string };
  setState: (updater: (state: { count: number; label: string }) => { count: number; label: string }) => void;
};

export const checks: Check[] = [
  {
    name: 'two components reading the same slice stay in sync after an external update',
    run: async (ctx) => {
      const { render, screen, expect, act, Component, mod } = ctx;
      render(<Component />);
      const { store } = mod as { store: AnyStore };
      await act(async () => {
        store.setState((s) => ({ ...s, count: s.count + 1 }));
      });
      expect(screen.getByTestId('count').textContent).to.equal('1');
      expect(screen.getByTestId('count-secondary').textContent).to.equal('1');
    },
  },
  {
    name: 'does not miss an update that happens between the initial render and the subscription',
    run: async (ctx) => {
      // Mount a sibling whose ref callback fires during the commit's layout phase —
      // strictly before any component's passive `useEffect` runs. Triggering the store
      // update there reproduces the exact gap a useState+useEffect subscription misses.
      const { render, screen, expect, act, Component, mod } = ctx;
      const { store } = mod as { store: AnyStore };
      let triggered = false;
      await act(async () => {
        render(
          <>
            <Component />
            <div
              ref={(node) => {
                if (node && !triggered) {
                  triggered = true;
                  store.setState((s) => ({ ...s, count: s.count + 1 }));
                }
              }}
            />
          </>,
        );
      });
      expect(screen.getByTestId('count').textContent, 'count after the race update').to.equal('1');
    },
  },
  {
    name: 'a component selecting one slice does not re-render when a different slice changes',
    run: async (ctx) => {
      const { render, screen, expect, act, Component, mod } = ctx;
      render(<Component />);
      const before = screen.getByTestId('label').getAttribute('data-renders');
      const { store } = mod as { store: AnyStore };
      await act(async () => {
        store.setState((s) => ({ ...s, count: s.count + 1 }));
      });
      expect(screen.getByTestId('count').textContent, 'sanity: count did update').to.equal('1');
      const after = screen.getByTestId('label').getAttribute('data-renders');
      expect(after, 'label render count after an unrelated (count) update').to.equal(before);
    },
  },
];
