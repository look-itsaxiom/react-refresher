import type { Check } from '../../../types';

type CartItem = { id: string; quantity: number };
type CartState = { items: CartItem[]; addItem: (id: string) => void; removeItem: (id: string) => void };
type Storage = { getItem: (name: string) => string | null; setItem: (name: string, value: string) => void };
type Mod = {
  defaultStorage: Storage;
  createInMemoryStorage: () => Storage;
  createCartStore: (storage: Storage) => { getState: () => CartState };
};

export const checks: Check[] = [
  {
    name: 'the total on screen stays correct after adding and removing items',
    run: async (ctx) => {
      const { render, screen, user, expect, Component } = ctx;
      render(<Component />);
      await user.click(screen.getByRole('button', { name: /add mug/i })); // mug: 12
      await user.click(screen.getByRole('button', { name: /add mug/i })); // mug x2: 24
      await user.click(screen.getByRole('button', { name: /add hat/i })); // + hat: 44
      expect(screen.getByTestId('total').textContent).to.equal('44');
      await user.click(screen.getByRole('button', { name: /remove mug/i })); // hat only: 20
      expect(screen.getByTestId('total').textContent).to.equal('20');
    },
  },
  {
    name: 'every set() call persists the current state to storage',
    run: async (ctx) => {
      const { render, screen, user, expect, mod, Component } = ctx;
      const { defaultStorage } = mod as unknown as Mod;
      render(<Component />);
      await user.click(screen.getByRole('button', { name: /add hat/i }));
      const raw = defaultStorage.getItem('cart');
      expect(raw, 'storage was written to after a change').to.not.equal(null);
      const persisted = JSON.parse(raw as string) as { items: CartItem[] };
      const hat = persisted.items.find((item) => item.id === 'hat');
      expect(hat, 'persisted items include the added line').to.not.equal(undefined);
      expect(hat?.quantity).to.equal(1);
    },
  },
  {
    name: 'a fresh store created against the same storage rehydrates the persisted cart',
    run: (ctx) => {
      const { expect, mod } = ctx;
      const { createInMemoryStorage, createCartStore } = mod as unknown as Mod;
      const sharedStorage = createInMemoryStorage();

      const firstLoad = createCartStore(sharedStorage);
      firstLoad.getState().addItem('socks');
      firstLoad.getState().addItem('socks');

      // Simulate a page reload: a brand new store instance, same underlying storage.
      const secondLoad = createCartStore(sharedStorage);
      const socks = secondLoad.getState().items.find((item) => item.id === 'socks');
      expect(socks, 'rehydrated store already has the persisted line at creation time').to.not.equal(undefined);
      expect(socks?.quantity).to.equal(2);
    },
  },
];
