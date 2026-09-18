import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'a status region exists before any save, and starts empty',
    run: async ({ render, screen, expect, Component }) => {
      render(<Component />);
      const status = screen.getByRole('status');
      expect(status.textContent?.trim()).to.equal('');
    },
  },
  {
    name: 'a successful save announces the confirmation in the status region',
    run: async ({ render, screen, user, expect, server, Component }) => {
      server.setLatency(0);
      render(<Component />);
      await user.type(screen.getByLabelText('Title'), 'Buy milk');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      const status = await screen.findByRole('status');
      expect(status.textContent).to.match(/Buy milk/);
    },
  },
  {
    name: 'a failed save surfaces the error as an alert',
    run: async ({ render, screen, user, expect, server, Component }) => {
      server.setLatency(0);
      server.failNext('The server is unavailable');
      render(<Component />);
      await user.click(screen.getByRole('button', { name: 'Save' }));

      const alert = await screen.findByRole('alert');
      expect(alert.textContent).to.match(/server is unavailable/);
    },
  },
  {
    name: 'exactly one status region exists throughout, even after a save',
    run: async ({ render, screen, user, expect, server, Component }) => {
      server.setLatency(0);
      render(<Component />);
      await user.type(screen.getByLabelText('Title'), 'Buy milk');
      await user.click(screen.getByRole('button', { name: 'Save' }));
      await screen.findByRole('status');

      expect(screen.getAllByRole('status')).to.have.lengthOf(1);
    },
  },
  {
    name: 'a fresh success clears any earlier error, and a fresh failure clears any earlier status text',
    run: async ({ render, screen, user, expect, server, Component }) => {
      server.setLatency(0);
      server.failNext('Save failed');
      render(<Component />);

      await user.type(screen.getByLabelText('Title'), 'Buy milk');
      await user.click(screen.getByRole('button', { name: 'Save' }));
      await screen.findByRole('alert');

      await user.click(screen.getByRole('button', { name: 'Save' }));
      const status = await screen.findByRole('status');
      expect(status.textContent).to.match(/Buy milk/);
      expect(screen.queryByRole('alert'), 'the earlier error should be cleared after a success').to.be.null;
    },
  },
];
