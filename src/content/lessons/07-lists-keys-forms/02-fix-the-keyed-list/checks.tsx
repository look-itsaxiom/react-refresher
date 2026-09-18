import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'renders all three starting items',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      expect(screen.getByText('Passport')).to.exist;
      expect(screen.getByText('Charger')).to.exist;
      expect(screen.getByText('Sunscreen')).to.exist;
    },
  },
  {
    name: 'each row exposes its item id via data-id',
    run: ({ render, expect, Component }) => {
      const { container } = render(<Component />);
      const ids = Array.from(container.querySelectorAll('li[data-id]')).map((el) => el.getAttribute('data-id'));
      expect(ids.sort()).to.deep.equal(['1', '2', '3']);
    },
  },
  {
    name: "removing the first row keeps the second row's typed note attached to its own item",
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const chargerNote = screen.getByLabelText('Note for Charger');
      await user.type(chargerNote, 'pack the fast one');
      await user.click(screen.getByRole('button', { name: 'Remove Passport' }));

      // The item labeled "Charger" should still show the note that was typed into it,
      // wherever it now sits in the list.
      expect(screen.getByLabelText('Note for Charger')).to.have.property('value', 'pack the fast one');
      // And the note should not have leaked onto a different item.
      expect(screen.getByLabelText('Note for Sunscreen')).to.have.property('value', '');
    },
  },
  {
    name: "removing the first row does not renumber the remaining items' data-id",
    run: async ({ render, screen, user, expect, Component }) => {
      const { container } = render(<Component />);
      await user.click(screen.getByRole('button', { name: 'Remove Passport' }));

      const chargerRow = screen.getByText('Charger').closest('li');
      const sunscreenRow = screen.getByText('Sunscreen').closest('li');
      expect(chargerRow?.getAttribute('data-id')).to.equal('2');
      expect(sunscreenRow?.getAttribute('data-id')).to.equal('3');
      expect(container.querySelectorAll('li').length).to.equal(2);
    },
  },
  {
    name: 'a newly added item gets its own note field, independent of existing rows',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.type(screen.getByLabelText('Note for Passport'), 'front pocket');
      await user.click(screen.getByRole('button', { name: 'Add item' }));

      expect(screen.getByLabelText('Note for Passport')).to.have.property('value', 'front pocket');
    },
  },
];
