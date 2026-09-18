import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'a member with an explicit role still shows that role',
    run: async ({ render, screen, within, expect, Component }) => {
      render(<Component />);
      const item = screen.getByText('Dan Ortiz').closest('li');
      expect(item).not.to.equal(null);
      expect(within(item as HTMLElement).getByText(/Admin/)).to.exist;
    },
  },
  {
    name: 'a member with no role falls back to "Member"',
    run: async ({ render, screen, within, expect, Component }) => {
      render(<Component />);
      const item = screen.getByText('Priya Shah').closest('li');
      expect(item).not.to.equal(null);
      expect(within(item as HTMLElement).getByText(/Member/)).to.exist;
    },
  },
  {
    name: 'the fallback applies independently to every member missing a role',
    run: async ({ render, screen, within, expect, Component }) => {
      render(<Component />);
      const item = screen.getByText('Lee Nguyen').closest('li');
      expect(item).not.to.equal(null);
      expect(within(item as HTMLElement).getByText(/Member/)).to.exist;
    },
  },
];
