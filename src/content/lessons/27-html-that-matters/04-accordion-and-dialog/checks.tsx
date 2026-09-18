import type { Check } from '../../../types';

function detailsFor(text: string): HTMLDetailsElement {
  const match = Array.from(document.querySelectorAll('details')).find((el) =>
    el.textContent?.includes(text),
  );
  if (!match) throw new Error(`no <details> found containing "${text}"`);
  return match as HTMLDetailsElement;
}

export const checks: Check[] = [
  {
    name: 'renders three <details name="faq"> items, all closed by default',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      const items = document.querySelectorAll('details');
      expect(items, 'expected three <details> elements').to.have.lengthOf(3);
      items.forEach((el) => {
        expect(el.open, 'each item should start closed').to.equal(false);
        expect(el.getAttribute('name')).to.equal('faq');
      });
      expect(screen.getByText('Do you offer refunds?')).to.exist;
    },
  },
  {
    name: 'clicking a question opens that item',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.click(screen.getByText('How do I cancel?'));
      expect(detailsFor('How do I cancel?').open).to.equal(true);
    },
  },
  {
    name: 'clicking an open question closes it again',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const question = screen.getByText('Is there a free trial?');
      await user.click(question);
      expect(detailsFor('Is there a free trial?').open, 'first click opens').to.equal(true);
      await user.click(question);
      expect(detailsFor('Is there a free trial?').open, 'second click closes').to.equal(false);
    },
  },
  {
    name: 'no dialog is present until "Delete account" is clicked',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      expect(screen.queryByRole('dialog')).to.equal(null);
    },
  },
  {
    name: 'opens the confirmation dialog and closes it again from inside',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.click(screen.getByRole('button', { name: 'Delete account' }));
      const dialog = screen.getByRole('dialog');
      expect(dialog).to.exist;
      expect(screen.getByText('Are you sure?')).to.exist;

      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByRole('dialog')).to.equal(null);
    },
  },
];
