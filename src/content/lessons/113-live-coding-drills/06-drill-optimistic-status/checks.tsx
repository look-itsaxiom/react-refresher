import { waitFor } from '@testing-library/dom';
import { addTodo } from '@server/todos';
import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'loads and renders tasks (latency 0)',
    run: async ({ server, render, screen, Component }) => {
      server.setLatency(0);
      await addTodo('Solder headers');
      await addTodo('Test power rail');
      render(<Component />);
      await screen.findByText('Solder headers');
      await screen.findByText('Test power rail');
    },
  },
  {
    name: 'flips optimistically, before the server responds',
    run: async ({ server, render, screen, user, expect, Component }) => {
      await addTodo('Flash firmware');
      server.setLatency(300);
      render(<Component />);
      const toggle = await screen.findByRole('button', { name: 'Toggle Flash firmware' }, { timeout: 2000 });
      expect(toggle.textContent).to.equal('Not done');
      await user.click(toggle);
      expect(toggle.textContent, 'should flip immediately, not after the 300ms server call').to.equal('Done');
      expect((toggle as HTMLButtonElement).disabled, 'should be pending immediately after click').to.equal(true);
    },
  },
  {
    name: 'rolls back and shows an error (in the aria-live region) when the server fails',
    run: async ({ server, render, screen, user, expect, Component }) => {
      await addTodo('Doomed task');
      server.setLatency(50);
      render(<Component />);
      const toggle = await screen.findByRole('button', { name: 'Toggle Doomed task' }, { timeout: 2000 });
      server.failNext('Toggle broke');
      await user.click(toggle);
      const live = await screen.findByText('Toggle broke', undefined, { timeout: 2000 });
      expect(live.closest('[aria-live="polite"]'), 'error should be in the aria-live region').to.exist;
      await waitFor(() => expect(toggle.textContent, 'should roll back to its prior state').to.equal('Not done'), {
        timeout: 2000,
      });
    },
  },
  {
    name: 'disables only the row being toggled, not the whole board',
    run: async ({ server, render, screen, user, expect, Component }) => {
      await addTodo('Task A');
      await addTodo('Task B');
      server.setLatency(300);
      render(<Component />);
      const toggleA = await screen.findByRole('button', { name: 'Toggle Task A' }, { timeout: 2000 });
      const toggleB = screen.getByRole('button', { name: 'Toggle Task B' });
      await user.click(toggleA);
      expect((toggleA as HTMLButtonElement).disabled, 'the clicked row should be disabled').to.equal(true);
      expect((toggleB as HTMLButtonElement).disabled, 'the other row should stay enabled').to.equal(false);
    },
  },
  {
    name: 'adding a task shows pending text and clears the input on success',
    run: async ({ server, render, screen, user, expect, Component }) => {
      server.setLatency(300);
      render(<Component />);
      const input = (await screen.findByLabelText('New task title', undefined, { timeout: 2000 })) as HTMLInputElement;
      await user.type(input, 'Drill mounting holes');
      await user.click(screen.getByRole('button', { name: /Add/ }));
      expect(screen.getByRole('button', { name: 'Adding…' }), 'submit button should show pending text').to.exist;
      await screen.findByText('Drill mounting holes', undefined, { timeout: 2000 });
      await waitFor(() => expect(input.value, 'input should clear after a successful add').to.equal(''), {
        timeout: 2000,
      });
    },
  },
  {
    name: 'an empty-title add shows a validation error in the aria-live region',
    run: async ({ server, render, screen, user, expect, Component }) => {
      server.setLatency(0);
      render(<Component />);
      await screen.findByLabelText('New task title', undefined, { timeout: 2000 });
      await user.click(screen.getByRole('button', { name: /Add/ }));
      const live = await screen.findByText(/required/i, undefined, { timeout: 2000 });
      expect(live.closest('[aria-live="polite"]')).to.exist;
    },
  },
];
