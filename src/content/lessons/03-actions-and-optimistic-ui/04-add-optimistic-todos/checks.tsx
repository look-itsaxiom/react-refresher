import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'shows the new todo immediately as pending, before the server responds',
    run: async ({ render, screen, user, expect, server, Component }) => {
      server.setLatency(500);
      render(<Component />);
      await user.type(screen.getByLabelText('Title'), 'Walk the dog');
      await user.click(screen.getByRole('button', { name: 'Add' }));
      const item = screen.queryByText('Walk the dog', { selector: 'li' });
      expect(item, 'todo should be in the list right away').to.not.equal(null);
      expect(item?.getAttribute('data-pending'), 'optimistic item should be marked pending').to.equal('true');
    },
  },
  {
    name: 'after the server confirms, the todo stays and is no longer pending',
    run: async ({ render, screen, user, expect, server, Component, sleep }) => {
      server.setLatency(100);
      render(<Component />);
      await user.type(screen.getByLabelText('Title'), 'Water plants');
      await user.click(screen.getByRole('button', { name: 'Add' }));
      await sleep(400);
      const items = screen.getAllByText('Water plants', { selector: 'li' });
      expect(items.length, 'exactly one item, not an optimistic duplicate').to.equal(1);
      expect(items[0]?.getAttribute('data-pending')).to.equal(null);
    },
  },
  {
    name: 'removes the optimistic todo and shows the error when the server fails',
    run: async ({ render, screen, user, expect, server, Component }) => {
      server.setLatency(100);
      server.failNext('Server exploded');
      render(<Component />);
      await user.type(screen.getByLabelText('Title'), 'Doomed todo');
      await user.click(screen.getByRole('button', { name: 'Add' }));
      const alert = await screen.findByRole('alert', undefined, { timeout: 2000 });
      expect(alert.textContent).to.contain('Server exploded');
      expect(screen.queryByText('Doomed todo', { selector: 'li' }), 'optimistic item should be rolled back').to.equal(null);
    },
  },
  {
    name: 'still resets the input after a successful add',
    run: async ({ render, screen, user, expect, server, Component, sleep }) => {
      server.setLatency(50);
      render(<Component />);
      const input = screen.getByLabelText('Title') as HTMLInputElement;
      await user.type(input, 'Read a book');
      await user.click(screen.getByRole('button', { name: 'Add' }));
      await sleep(300);
      expect(input.value).to.equal('');
    },
  },
];
