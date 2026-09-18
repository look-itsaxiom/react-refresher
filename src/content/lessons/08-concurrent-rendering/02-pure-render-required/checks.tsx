import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'log has zero entries right after mount',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      expect(screen.getByTestId('entry-count').textContent).to.equal('0');
    },
  },
  {
    name: 'clicking "Add entry" once adds exactly one entry',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.click(screen.getByRole('button', { name: 'Add entry' }));
      expect(screen.getByTestId('entry-count').textContent).to.equal('1');
    },
  },
  {
    name: 'three clicks add exactly three entries (StrictMode’s extra render pass must not duplicate them)',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const button = screen.getByRole('button', { name: 'Add entry' });
      await user.click(button);
      await user.click(button);
      await user.click(button);
      expect(screen.getByTestId('entry-count').textContent).to.equal('3');
    },
  },
];
