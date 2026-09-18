import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'roster keeps registration order right after mount (players prop is not mutated)',
    run: ({ render, screen, within, expect, Component }) => {
      render(<Component />);
      const names = within(screen.getByTestId('roster')).getAllByRole('listitem').map((li) => li.textContent);
      expect(names).to.deep.equal(['Ada', 'Grace', 'Alan']);
    },
  },
  {
    name: 'ranked list is actually sorted by score, descending',
    run: ({ render, screen, within, expect, Component }) => {
      render(<Component />);
      const names = within(screen.getByTestId('ranked')).getAllByRole('listitem').map((li) => li.textContent);
      expect(names).to.deep.equal(['Grace', 'Alan', 'Ada']);
    },
  },
  {
    name: 'roster still keeps registration order after re-ranking twice',
    run: async ({ render, screen, within, user, expect, Component }) => {
      render(<Component />);
      const button = screen.getByRole('button', { name: 'Re-rank' });
      await user.click(button);
      await user.click(button);
      const names = within(screen.getByTestId('roster')).getAllByRole('listitem').map((li) => li.textContent);
      expect(names).to.deep.equal(['Ada', 'Grace', 'Alan']);
    },
  },
  {
    name: 'click count reads 0 right after mount, then tracks clicks exactly',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      expect(screen.getByTestId('click-count').textContent).to.equal('0');
      const button = screen.getByRole('button', { name: 'Re-rank' });
      await user.click(button);
      await user.click(button);
      await user.click(button);
      expect(screen.getByTestId('click-count').textContent).to.equal('3');
    },
  },
];
