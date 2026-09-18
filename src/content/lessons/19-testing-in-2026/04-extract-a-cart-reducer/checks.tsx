import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'selectTotals rounds the subtotal to the cent instead of accumulating floating-point drift',
    run: ({ mod, expect }) => {
      const state = {
        items: [
          { id: 'a', name: 'A', price: 10.1, qty: 1 },
          { id: 'b', name: 'B', price: 20.2, qty: 1 },
        ],
        couponPercent: 0,
      };
      const totals = (mod as { selectTotals: (s: unknown) => { subtotal: number } }).selectTotals(state);
      expect(totals.subtotal).to.equal(30.3);
    },
  },
  {
    name: 'a coupon discount is capped at $5 even on a large subtotal',
    run: ({ mod, expect }) => {
      const state = { items: [{ id: 'a', name: 'A', price: 100, qty: 1 }], couponPercent: 50 };
      const totals = (
        mod as { selectTotals: (s: unknown) => { subtotal: number; discount: number; total: number } }
      ).selectTotals(state);
      expect(totals.discount).to.equal(5);
      expect(totals.total).to.equal(totals.subtotal - totals.discount);
    },
  },
  {
    name: 'removing an id that is not in the cart is a no-op, not a mutation of the last item',
    run: ({ mod, expect }) => {
      const state = {
        items: [
          { id: 'a', name: 'A', price: 5, qty: 1 },
          { id: 'b', name: 'B', price: 7, qty: 2 },
        ],
        couponPercent: 0,
      };
      const next = (
        mod as { cartReducer: (s: unknown, a: unknown) => { items: unknown[] } }
      ).cartReducer(state, { type: 'remove', id: 'does-not-exist' });
      expect(next.items).to.deep.equal(state.items);
    },
  },
  {
    name: 'adding an item already in the cart increases its quantity instead of duplicating the row',
    run: ({ mod, expect }) => {
      const state = { items: [{ id: 'a', name: 'A', price: 5, qty: 1 }], couponPercent: 0 };
      const next = (
        mod as { cartReducer: (s: unknown, a: unknown) => { items: { id: string; qty: number }[] } }
      ).cartReducer(state, { type: 'add', item: { id: 'a', name: 'A', price: 5, qty: 2 } });
      expect(next.items.length).to.equal(1);
      expect(next.items[0]?.qty).to.equal(3);
    },
  },
  {
    name: 'the cart UI still works end to end: adding items and applying a coupon updates the total shown',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.click(screen.getByRole('button', { name: /add trail mix/i }));
      await user.click(screen.getByRole('button', { name: /add water bottle/i }));
      await user.click(screen.getByRole('button', { name: /apply 20% off/i }));
      // subtotal 30.30, 20% would be 6.06 but the discount caps at $5 -> total 25.30
      expect(screen.getByText('Total: $25.30')).to.exist;
    },
  },
];
