import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'shows the initial theme in the badge and the button label',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      expect(screen.getByTestId('status-badge').textContent).to.equal('light');
      expect(screen.getByRole('button').textContent).to.equal('Switch to dark');
    },
  },
  {
    name: 'clicking the toggle button updates the badge and the button label together',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.click(screen.getByRole('button'));
      expect(screen.getByTestId('status-badge').textContent).to.equal('dark');
      expect(screen.getByRole('button').textContent).to.equal('Switch to light');
    },
  },
  {
    name: 'toggling twice returns to the original theme',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByRole('button'));
      expect(screen.getByTestId('status-badge').textContent).to.equal('light');
      expect(screen.getByRole('button').textContent).to.equal('Switch to dark');
    },
  },
];
