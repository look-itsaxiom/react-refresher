import type { Check } from '../../../types';

type FakeConnection = { emit(message: string): void };

export const checks: Check[] = [
  {
    name: 'connects exactly once on mount',
    run: async ({ render, mod, expect, Component }) => {
      render(<Component />);
      const connections = mod.connections as FakeConnection[];
      expect(connections.length).to.equal(1);
    },
  },
  {
    name: 'toggling the theme does not open a new connection',
    run: async ({ render, screen, user, mod, expect, Component }) => {
      render(<Component />);
      await user.click(screen.getByRole('button', { name: 'Toggle theme' }));
      await user.click(screen.getByRole('button', { name: 'Toggle theme' }));
      await user.click(screen.getByRole('button', { name: 'Toggle theme' }));
      const connections = mod.connections as FakeConnection[];
      expect(connections.length).to.equal(1);
    },
  },
  {
    name: 'an incoming message is logged with the current theme, not the theme from mount',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.click(screen.getByRole('button', { name: 'Toggle theme' })); // light -> dark
      await user.click(screen.getByRole('button', { name: 'Simulate incoming message' }));
      const log = screen.getByTestId('log');
      expect(log.textContent).to.include('[dark] New message');
      expect(log.textContent).to.not.include('[light] New message');
    },
  },
];
