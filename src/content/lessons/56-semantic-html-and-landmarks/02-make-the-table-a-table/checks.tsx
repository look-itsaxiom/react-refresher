import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'the grid is a real <table>, named by a <caption>',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      const table = screen.getByRole('table', { name: 'Pricing plans' });
      expect(table.tagName).to.equal('TABLE');
      expect(table.querySelector('caption'), 'expected a real <caption> element, not just a nearby heading').to.exist;
    },
  },
  {
    name: 'the header row exposes three column headers, named Plan, Seats, and Price',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      const headers = screen.getAllByRole('columnheader');
      expect(headers, 'expected exactly 3 <th scope="col"> cells').to.have.lengthOf(3);
      expect(screen.getByRole('columnheader', { name: 'Plan' })).to.exist;
      expect(screen.getByRole('columnheader', { name: 'Seats' })).to.exist;
      expect(screen.getByRole('columnheader', { name: /^price/i })).to.exist;
    },
  },
  {
    name: 'each plan name is a row header (<th scope="row">), not a plain cell',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      const rowHeaders = screen.getAllByRole('rowheader');
      const names = rowHeaders.map((rh) => rh.textContent?.trim());
      expect(names.sort()).to.deep.equal(['Business', 'Enterprise', 'Starter', 'Team']);
      rowHeaders.forEach((rh) => {
        expect(rh.tagName, `"${rh.textContent}" should be a <th>, not a <td>`).to.equal('TH');
        expect(rh.getAttribute('scope')).to.equal('row');
      });
    },
  },
  {
    name: 'seats and price values are still reachable as ordinary cells',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      expect(screen.getByRole('cell', { name: '$29/mo' }), 'Starter\'s price cell').to.exist;
      expect(screen.getByRole('cell', { name: '$899/mo' }), 'Enterprise\'s price cell').to.exist;
      expect(screen.getByRole('cell', { name: '5' }), 'Starter\'s seats cell').to.exist;
    },
  },
  {
    name: 'rows start sorted ascending by price, matching aria-sort="ascending"',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      const priceHeader = screen.getByRole('columnheader', { name: /^price/i });
      expect(priceHeader.getAttribute('aria-sort'), 'the Price header should announce its current sort direction').to.equal('ascending');

      const rowHeaders = screen.getAllByRole('rowheader');
      const namesInOrder = rowHeaders.map((rh) => rh.textContent?.trim());
      expect(namesInOrder, 'cheapest ($29) to most expensive ($899)').to.deep.equal([
        'Starter',
        'Team',
        'Business',
        'Enterprise',
      ]);
    },
  },
  {
    name: 'clicking the Price header\'s sort button reverses row order and flips aria-sort',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const priceHeader = screen.getByRole('columnheader', { name: /^price/i });
      const sortButton = screen.getByRole('button', { name: /price/i });
      expect(sortButton.tagName, 'the sort control must be a real <button>, not an onClick on the <th>').to.equal('BUTTON');

      await user.click(sortButton);

      expect(priceHeader.getAttribute('aria-sort')).to.equal('descending');
      const namesAfter = screen.getAllByRole('rowheader').map((rh) => rh.textContent?.trim());
      expect(namesAfter, 'most expensive ($899) to cheapest ($29)').to.deep.equal([
        'Enterprise',
        'Business',
        'Team',
        'Starter',
      ]);

      await user.click(sortButton);
      expect(priceHeader.getAttribute('aria-sort'), 'clicking again should flip back to ascending').to.equal('ascending');
    },
  },
];
