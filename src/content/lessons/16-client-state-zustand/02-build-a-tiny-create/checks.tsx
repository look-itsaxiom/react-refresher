import type { Check } from '../../../types';

type CartState = { count: number; label: string };
type BoundStore = {
  getState: () => CartState;
  setState: (updater: Partial<CartState> | ((state: CartState) => Partial<CartState>)) => void;
};

export const checks: Check[] = [
  {
    name: 'clicking increment updates the count shown on screen',
    run: async (ctx) => {
      const { render, screen, user, expect, Component } = ctx;
      render(<Component />);
      await user.click(screen.getByRole('button', { name: /increment/i }));
      expect(screen.getByTestId('count').textContent).to.equal('1');
    },
  },
  {
    name: 'a component selecting label does not re-render when only count changes',
    run: async (ctx) => {
      const { render, screen, user, expect, Component } = ctx;
      render(<Component />);
      const before = screen.getByTestId('label').getAttribute('data-renders');
      await user.click(screen.getByRole('button', { name: /increment/i }));
      expect(screen.getByTestId('count').textContent, 'sanity: count updated').to.equal('1');
      const after = screen.getByTestId('label').getAttribute('data-renders');
      expect(after, 'label render count after an unrelated (count) update').to.equal(before);
    },
  },
  {
    name: 'setState accepts a function updater that reads the previous state',
    run: async (ctx) => {
      const { mod, expect, act } = ctx;
      const { useCartStore } = mod as { useCartStore: BoundStore };
      await act(async () => {
        useCartStore.setState((s) => ({ count: s.count + 5 }));
        useCartStore.setState((s) => ({ count: s.count + 5 }));
      });
      expect(useCartStore.getState().count).to.equal(10);
    },
  },
  {
    name: 'getState reads the current value from outside any component render',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { useCartStore } = mod as { useCartStore: BoundStore };
      expect(useCartStore.getState()).to.deep.equal({ count: 0, label: 'widgets' });
    },
  },
];
