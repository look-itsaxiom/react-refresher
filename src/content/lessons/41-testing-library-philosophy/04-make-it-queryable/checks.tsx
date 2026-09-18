import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'the search field has an accessible name and lives inside a search landmark',
    run: ({ render, screen, within, expect, Component }) => {
      render(<Component />);
      const search = screen.getByRole('search');
      const input = within(search).getByLabelText(/search/i);
      expect(input.tagName).to.equal('INPUT');
    },
  },
  {
    name: 'typing in the labelled search field filters the visible list, the way a user would drive it',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const input = screen.getByLabelText(/search/i);
      await user.type(input, 'ship');
      expect(screen.queryByText('Ship release')).to.exist;
      expect(screen.queryByText('Write report')).to.not.exist;
      expect(screen.queryByText('Review PR')).to.not.exist;
    },
  },
  {
    name: 'the filter chips are real, named, toggle buttons reflecting their pressed state',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const active = screen.getByRole('button', { name: /active/i, pressed: false });
      await user.click(active);
      expect(screen.getByRole('button', { name: /active/i, pressed: true })).to.exist;
      expect(screen.queryByText('Review PR')).to.not.exist;
      expect(screen.queryByText('Write report')).to.exist;
    },
  },
  {
    name: 'only one filter button reads as pressed at a time',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.click(screen.getByRole('button', { name: /active/i }));
      await user.click(screen.getByRole('button', { name: /done/i }));
      expect(screen.getByRole('button', { name: /done/i, pressed: true })).to.exist;
      expect(screen.getByRole('button', { name: /active/i, pressed: false })).to.exist;
      expect(screen.getByRole('button', { name: /all/i, pressed: false })).to.exist;
    },
  },
  {
    name: 'the result count updates and is exposed as an aria-live announcement',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const done = screen.getByRole('button', { name: /done/i, pressed: false });
      await user.click(done);
      const count = await screen.findByText(/1 results/i);
      expect(count.closest('[aria-live]')).to.exist;
    },
  },
];
