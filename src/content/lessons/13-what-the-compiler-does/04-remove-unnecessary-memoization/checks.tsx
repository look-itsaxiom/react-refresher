import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'shows every item with no filters applied',
    run: ({ render, screen, within, expect, Component }) => {
      render(<Component />);
      const names = within(screen.getByTestId('results')).getAllByRole('listitem').map((li) => li.textContent);
      expect(names).to.deep.equal(['Notebook', 'Espresso Machine', 'Standing Desk', 'Blender']);
    },
  },
  {
    name: 'typing in search filters by name',
    run: async ({ render, screen, within, user, expect, Component }) => {
      render(<Component />);
      await user.type(screen.getByLabelText('Search'), 'desk');
      const names = within(screen.getByTestId('results')).getAllByRole('listitem').map((li) => li.textContent);
      expect(names).to.deep.equal(['Standing Desk']);
    },
  },
  {
    name: 'changing the category filters immediately, with no search text needed',
    run: async ({ render, screen, within, user, expect, Component }) => {
      render(<Component />);
      await user.selectOptions(screen.getByLabelText('Category'), 'kitchen');
      const names = within(screen.getByTestId('results')).getAllByRole('listitem').map((li) => li.textContent);
      expect(names).to.deep.equal(['Espresso Machine', 'Blender']);
    },
  },
  {
    name: 'search and category combine correctly',
    run: async ({ render, screen, within, user, expect, Component }) => {
      render(<Component />);
      await user.selectOptions(screen.getByLabelText('Category'), 'kitchen');
      await user.type(screen.getByLabelText('Search'), 'esp');
      const names = within(screen.getByTestId('results')).getAllByRole('listitem').map((li) => li.textContent);
      expect(names).to.deep.equal(['Espresso Machine']);
    },
  },
];
