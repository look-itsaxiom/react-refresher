import { waitFor } from '@testing-library/dom';
import type { Check } from '../../../types';

type Stats = { stats: { getTodosCalls: number } };

export const checks: Check[] = [
  {
    name: 'shows the new todo immediately as pending, before the server responds',
    run: async (ctx) => {
      ctx.server.setLatency(3000); // generous: this check only asserts what is visible before the server responds
      const { render, screen, user, expect, Component } = ctx;
      render(<Component />);
      await user.type(screen.getByLabelText('Title'), 'Walk the dog');
      await user.click(screen.getByRole('button', { name: /add/i }));
      const item = screen.queryByText('Walk the dog', { selector: 'li' });
      expect(item, 'the optimistic todo should be in the list right away').to.not.equal(null);
      expect(item?.getAttribute('data-pending'), 'optimistic item should be marked pending').to.equal('true');
    },
  },
  {
    name: 'on success, invalidating refetches from the server instead of trusting the optimistic guess',
    run: async (ctx) => {
      ctx.server.setLatency(50);
      const { render, screen, user, expect, mod, Component } = ctx;
      render(<Component />);
      await user.type(screen.getByLabelText('Title'), 'Water plants');
      await user.click(screen.getByRole('button', { name: /add/i }));
      await waitFor(
        () => {
          const items = screen.getAllByText('Water plants', { selector: 'li' });
          expect(items.length, 'exactly one item, not an optimistic duplicate').to.equal(1);
          expect(items[0]?.getAttribute('data-pending'), 'no longer pending once confirmed').to.equal(null);
        },
        { timeout: 2000 },
      );
      const { stats } = mod as unknown as Stats;
      expect(
        stats.getTodosCalls,
        'a successful mutation should invalidate and refetch, not just splice the optimistic entry in',
      ).to.be.greaterThanOrEqual(2);
    },
  },
  {
    name: 'removes the optimistic todo and shows the error when the server fails',
    run: async (ctx) => {
      // The mount itself makes a getTodos() call (the initial query load) — let that settle
      // on its own success *before* arming failNext, so the forced failure lands on the
      // addTodo() call the test actually cares about, not on the unrelated initial load.
      ctx.server.setLatency(0); // let the initial load finish immediately
      const { render, screen, user, expect, sleep, server, Component } = ctx;
      render(<Component />);
      await sleep(50);
      server.setLatency(20);
      server.failNext('Server exploded');
      await user.type(screen.getByLabelText('Title'), 'Doomed todo');
      await user.click(screen.getByRole('button', { name: /add/i }));
      const alert = await screen.findByRole('alert', undefined, { timeout: 2000 });
      expect(alert.textContent).to.contain('Server exploded');
      expect(
        screen.queryByText('Doomed todo', { selector: 'li' }),
        'the optimistic item should be rolled back on failure',
      ).to.equal(null);
    },
  },
  {
    name: 'disables the submit button while the mutation is in flight, then re-enables it',
    run: async (ctx) => {
      ctx.server.setLatency(150);
      const { render, screen, user, expect, Component } = ctx;
      render(<Component />);
      await user.type(screen.getByLabelText('Title'), 'Read a book');
      await user.click(screen.getByRole('button', { name: /add/i }));
      const button = screen.getByRole('button') as HTMLButtonElement;
      expect(button.disabled, 'button should disable itself while isPending is true').to.equal(true);
      await waitFor(() => expect(button.disabled, 'button should re-enable once the mutation settles').to.equal(false), {
        timeout: 2000,
      });
    },
  },
];
