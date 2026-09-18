import { waitFor } from '@testing-library/dom';
import type { Check } from '../../../types';

type Stats = { stats: { fetchCount: number } };
type Invalidate = { invalidate: (key: string) => void };

export const checks: Check[] = [
  {
    name: 'two components reading the same key trigger exactly one fetch',
    run: async (ctx) => {
      const { render, screen, expect, Component, mod } = ctx;
      render(<Component />);
      await waitFor(() => {
        expect(screen.getByTestId('user-a').textContent).to.equal('Ada Lovelace');
        expect(screen.getByTestId('user-b').textContent).to.equal('Ada Lovelace');
      });
      const { stats } = mod as unknown as Stats;
      expect(stats.fetchCount, 'fetchCount after two components mount with the same key').to.equal(1);
    },
  },
  {
    name: 'cached data shows instantly on remount, then a stale entry refetches in the background',
    run: async (ctx) => {
      const { render, screen, expect, sleep, Component, mod } = ctx;
      const first = render(<Component />);
      await waitFor(() => expect(screen.getByTestId('user-a').textContent).to.equal('Ada Lovelace'));
      const { stats } = mod as unknown as Stats;
      const afterFirstLoad = stats.fetchCount;
      first.unmount();
      await sleep(80); // longer than the exercise's staleTime, so the cached entry is now stale
      render(<Component />);
      // The very first paint already shows the cached name — no "Loading…" flash on remount.
      expect(screen.getByTestId('user-a').textContent, 'stale data should render immediately').to.equal(
        'Ada Lovelace',
      );
      await waitFor(() => {
        expect(stats.fetchCount, 'a stale entry should trigger a background refetch').to.be.greaterThan(
          afterFirstLoad,
        );
      });
    },
  },
  {
    name: 'invalidate(key) makes the next read refetch instead of reusing the cache',
    run: async (ctx) => {
      const { render, screen, expect, Component, mod } = ctx;
      const first = render(<Component />);
      await waitFor(() => expect(screen.getByTestId('user-a').textContent).to.equal('Ada Lovelace'));
      const { stats } = mod as unknown as Stats;
      const afterFirstLoad = stats.fetchCount;
      first.unmount();
      const { invalidate } = mod as unknown as Invalidate;
      invalidate('user:1');
      render(<Component />);
      await waitFor(() => {
        expect(stats.fetchCount, 'invalidated key should be refetched').to.be.greaterThan(afterFirstLoad);
      });
      await waitFor(() => expect(screen.getByTestId('user-a').textContent).to.equal('Ada Lovelace'));
    },
  },
  {
    name: "an unmounted component's response updates the cache without crashing",
    run: async (ctx) => {
      const { render, screen, expect, sleep, Component } = ctx;
      const first = render(<Component />);
      // Unmount before the (latency-0, but still async) fetch has a chance to resolve.
      first.unmount();
      await sleep(50);
      // A fresh mount afterwards should see the cache already populated from that earlier
      // fetch — proving the response was applied to the cache and didn't throw when the
      // original component was gone.
      render(<Component />);
      await waitFor(() => expect(screen.getByTestId('user-a').textContent).to.equal('Ada Lovelace'));
    },
  },
];
