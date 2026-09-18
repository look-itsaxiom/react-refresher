import { waitFor } from '@testing-library/dom';
import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'renders with a count of 0',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      expect(screen.getByTestId('count').textContent).to.equal('0');
    },
  },
  {
    name: '"+3" increments by 3 in a single click',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.click(screen.getByRole('button', { name: '+3' }));
      expect(screen.getByTestId('count').textContent).to.equal('3');
      await user.click(screen.getByRole('button', { name: '+3' }));
      expect(screen.getByTestId('count').textContent).to.equal('6');
    },
  },
  {
    name: '"+1 in a moment" does not clobber clicks made while it waits',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.click(screen.getByRole('button', { name: '+1 in a moment' }));
      await user.click(screen.getByRole('button', { name: '+3' }));
      expect(screen.getByTestId('count').textContent).to.equal('3');
      await waitFor(
        () => expect(screen.getByTestId('count').textContent, 'after the delayed increment fires').to.equal('4'),
        { timeout: 2000 },
      );
    },
  },
  {
    name: 'Reset returns to 0',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.click(screen.getByRole('button', { name: '+3' }));
      await user.click(screen.getByRole('button', { name: 'Reset' }));
      expect(screen.getByTestId('count').textContent).to.equal('0');
    },
  },
];
