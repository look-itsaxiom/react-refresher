import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'adds a todo to the list after submitting',
    run: async ({ render, screen, user, server, Component }) => {
      server.setLatency(30);
      render(<Component />);
      await user.type(screen.getByLabelText('Title'), 'Walk the dog');
      await user.click(screen.getByRole('button', { name: 'Add' }));
      await screen.findByText('Walk the dog', { selector: 'li' }, { timeout: 2000 });
    },
  },
  {
    name: 'disables the button and shows "Adding…" while the server is working',
    run: async ({ render, screen, user, expect, server, Component }) => {
      server.setLatency(400);
      render(<Component />);
      await user.type(screen.getByLabelText('Title'), 'Water plants');
      await user.click(screen.getByRole('button', { name: 'Add' }));
      const button = screen.getByRole('button');
      expect(button.textContent).to.equal('Adding…');
      expect((button as HTMLButtonElement).disabled).to.equal(true);
      await screen.findByText('Water plants', { selector: 'li' }, { timeout: 2000 });
      expect(screen.getByRole('button').textContent).to.equal('Add');
    },
  },
  {
    name: 'clears the input after a successful add (actions reset the form)',
    run: async ({ render, screen, user, expect, server, Component }) => {
      server.setLatency(30);
      render(<Component />);
      const input = screen.getByLabelText('Title') as HTMLInputElement;
      await user.type(input, 'Read a book');
      await user.click(screen.getByRole('button', { name: 'Add' }));
      await screen.findByText('Read a book', { selector: 'li' }, { timeout: 2000 });
      expect(input.value, 'input should be empty after the action completes').to.equal('');
    },
  },
  {
    name: 'shows a validation error for an empty title',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.click(screen.getByRole('button', { name: 'Add' }));
      const alert = await screen.findByRole('alert', undefined, { timeout: 2000 });
      expect(alert.textContent).to.match(/required/i);
    },
  },
  {
    name: 'shows the server error message when the server fails',
    run: async ({ render, screen, user, expect, server, Component }) => {
      server.setLatency(30);
      server.failNext('Server exploded');
      render(<Component />);
      await user.type(screen.getByLabelText('Title'), 'Doomed todo');
      await user.click(screen.getByRole('button', { name: 'Add' }));
      const alert = await screen.findByRole('alert', undefined, { timeout: 2000 });
      expect(alert.textContent).to.contain('Server exploded');
      expect(screen.queryByText('Doomed todo', { selector: 'li' })).to.equal(null);
    },
  },
];
