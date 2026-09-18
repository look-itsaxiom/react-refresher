import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'renders an option for every item plus the placeholder',
    run: async ({ render, screen, expect, Component }) => {
      render(<Component />);
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      const labels = Array.from(select.options).map((o) => o.textContent);
      expect(labels).to.include.members(['Starter', 'Team', 'Enterprise']);
      expect(labels.length).to.equal(4);
    },
  },
  {
    name: "selecting an option shows that plan's label and seat count",
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.selectOptions(screen.getByRole('combobox'), 'team');
      expect(screen.getByText(/Team.*5 seats/)).to.exist;
    },
  },
  {
    name: 'renders the singular "seat" for a plan with exactly one seat',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.selectOptions(screen.getByRole('combobox'), 'starter');
      expect(screen.getByText(/Starter.*1 seat\b/)).to.exist;
    },
  },
  {
    name: "switching the selection replaces the previous plan's details entirely",
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'team');
      await user.selectOptions(select, 'enterprise');
      expect(screen.queryByText(/Team.*5 seats/)).to.equal(null);
      expect(screen.getByText(/Enterprise.*50 seats/)).to.exist;
    },
  },
];
