import { waitFor } from '@testing-library/dom';
import type { Check } from '../../../types';

type Stats = { stats: { requestCount: number; byDocument: Record<string, number> } };
type FailNext = { failNext: (message?: string) => void };

export const checks: Check[] = [
  {
    name: 'two components requesting the same document+variables dedupe into exactly one transport() call',
    run: async (ctx) => {
      const { render, screen, expect, mod, Component } = ctx;
      render(<Component />);
      await waitFor(() => {
        expect(screen.getByTestId('user-a').textContent).to.equal('Ada Lovelace');
        expect(screen.getByTestId('user-a-dup').textContent).to.equal('Ada Lovelace');
      });
      const { stats } = mod as unknown as Stats;
      expect(stats.byDocument['GetUser'], 'GetUser requests after two components mount with the same key').to.equal(1);
    },
  },
  {
    name: 'a mutation through one query optimistically updates a sibling reading the same entity via a different query, then both settle',
    run: async (ctx) => {
      const { render, screen, user, expect, Component } = ctx;
      render(<Component />);
      await waitFor(() => {
        expect(screen.getByTestId('user-a').textContent).to.equal('Ada Lovelace');
        expect(screen.getByTestId('user-b').textContent).to.equal('Ada Lovelace');
      });

      await user.click(screen.getByRole('button', { name: /rename/i }));

      // Right after the click resolves, the optimistic write should already have landed —
      // on BOTH cards, even though "user-b" reads through a different document name.
      expect(screen.getByTestId('user-a').textContent, 'optimistic update on the mutated query').to.equal('Ada King');
      expect(screen.getByTestId('user-b').textContent, 'optimistic update should reach an unrelated query too').to.equal(
        'Ada King',
      );

      await waitFor(() => {
        expect(screen.getByTestId('user-a').textContent).to.equal('Ada King');
        expect(screen.getByTestId('user-b').textContent).to.equal('Ada King');
      });
    },
  },
  {
    name: 'a failed mutation rolls the optimistic write back on every dependent query and surfaces the error',
    run: async (ctx) => {
      const { render, screen, user, expect, mod, Component } = ctx;
      render(<Component />);
      await waitFor(() => {
        expect(screen.getByTestId('user-a').textContent).to.equal('Ada Lovelace');
        expect(screen.getByTestId('user-b').textContent).to.equal('Ada Lovelace');
      });

      const { failNext } = mod as unknown as FailNext;
      failNext('Server exploded');

      await user.click(screen.getByRole('button', { name: /rename/i }));

      // The optimistic write lands the same way as the happy path, but once the forced
      // failure comes back it should roll back on both cards and show the error.
      await waitFor(() => {
        expect(screen.getByTestId('user-a').textContent, 'rolled back after failure').to.equal('Ada Lovelace');
        expect(screen.getByTestId('user-b').textContent, 'rollback should reach the other query too').to.equal(
          'Ada Lovelace',
        );
        expect(screen.getByTestId('mutation-error').textContent).to.contain('Server exploded');
      });
    },
  },
  {
    name: 'shows a loading state before the first response, and a remount of an already-cached key reads the cache instead of refetching',
    run: async (ctx) => {
      const { render, screen, expect, mod, Component } = ctx;
      render(<Component />);
      expect(screen.getByTestId('user-a').textContent, 'nothing resolved yet').to.equal('Loading…');
      await waitFor(() => expect(screen.getByTestId('user-a').textContent).to.equal('Ada Lovelace'));

      const { stats } = mod as unknown as Stats;
      const afterInitialLoad = stats.requestCount;
      render(<Component />);
      await waitFor(() => expect(screen.getAllByTestId('user-a')[0]!.textContent).to.equal('Ada Lovelace'));
      expect(stats.requestCount, 'a second mount of an already-loaded key should not refetch').to.equal(
        afterInitialLoad,
      );
    },
  },
];
