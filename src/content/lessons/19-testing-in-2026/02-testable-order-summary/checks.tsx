import { waitFor } from '@testing-library/dom';
import type { ComponentType } from 'react';
import type { Check } from '../../../types';

type OrderSummaryProps = {
  now?: () => number;
  random?: () => number;
  loadOrder?: () => Promise<{ id: string; items: { id: string; name: string; price: number; qty: number }[] }>;
};

export const checks: Check[] = [
  {
    name: 'renders the order as a heading and a table of line items, with no test ids required',
    run: async ({ render, screen, within, expect, Component }) => {
      render(<Component />);
      await waitFor(() => {
        expect(screen.getByRole('heading').textContent).to.match(/ord_1/i);
      });
      const table = screen.getByRole('table');
      const rows = within(table).getAllByRole('row');
      // one header row + two item rows
      expect(rows.length).to.equal(3);
      expect(screen.getByText(/Trail mix/i)).to.exist;
      expect(screen.getByText(/Water bottle/i)).to.exist;
    },
  },
  {
    name: 'a fixed `now` and a fixed `random` produce identical output across renders',
    run: async ({ render, screen, expect, Component }) => {
      const OrderSummary = Component as ComponentType<OrderSummaryProps>;
      const fixedNow = () => new Date('2027-03-14T00:00:00Z').getTime();
      const fixedRandom = () => 0.42;

      const first = render(<OrderSummary now={fixedNow} random={fixedRandom} />);
      await waitFor(() => {
        expect(screen.getByRole('heading')).to.exist;
      });
      const firstText = document.body.textContent;
      first.unmount();

      render(<OrderSummary now={fixedNow} random={fixedRandom} />);
      await waitFor(() => {
        expect(screen.getByRole('heading')).to.exist;
      });
      const secondText = document.body.textContent;

      expect(firstText).to.equal(secondText);
    },
  },
  {
    name: 'renders whatever order the injected `loadOrder` resolves with, not the built-in default',
    run: async ({ render, screen, expect, Component }) => {
      const OrderSummary = Component as ComponentType<OrderSummaryProps>;
      const stubOrder = {
        id: 'ord_stub',
        items: [{ id: 'x', name: 'Zebra socks', price: 10, qty: 3 }],
      };
      render(<OrderSummary loadOrder={() => Promise.resolve(stubOrder)} />);
      await waitFor(() => {
        expect(screen.getByText(/Zebra socks/i)).to.exist;
      });
      expect(screen.getByRole('heading').textContent).to.match(/ord_stub/i);
      expect(screen.getByText('Subtotal: $30.00')).to.exist;
    },
  },
];
