import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'clicking a checkbox toggles that todo',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const checkbox = screen.getByRole('checkbox', { name: /write lesson/i });
      expect((checkbox as HTMLInputElement).checked).to.equal(false);
      await user.click(checkbox);
      expect((checkbox as HTMLInputElement).checked).to.equal(true);
    },
  },
  {
    name: 'rows do not re-render when an unrelated part of the parent updates',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const rows = screen.getAllByRole('listitem');
      expect(rows.map((r) => r.getAttribute('data-renders'))).to.deep.equal(['1', '1']);

      const bump = screen.getByRole('button', { name: /unrelated update/i });
      await user.click(bump);
      await user.click(bump);
      await user.click(bump);

      const rowsAfter = screen.getAllByRole('listitem');
      expect(rowsAfter.map((r) => r.getAttribute('data-renders'))).to.deep.equal(['1', '1']);
    },
  },
  {
    name: 'toggling one row does not re-render its sibling',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const shipItRow = screen.getByText(/ship it/i).closest('li');
      expect(shipItRow?.getAttribute('data-renders')).to.equal('1');

      await user.click(screen.getByRole('checkbox', { name: /write lesson/i }));

      const shipItRowAfter = screen.getByText(/ship it/i).closest('li');
      expect(shipItRowAfter?.getAttribute('data-renders')).to.equal('1');
    },
  },
];
