import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'shows the initial total in a single render',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      expect(screen.getByTestId('total').textContent).to.equal('$8');
      expect(screen.getByTestId('cart-renders').textContent).to.equal('1');
    },
  },
  {
    name: 'adding an item updates the total without an extra render',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.click(screen.getByRole('button', { name: 'Add hat' }));
      expect(screen.getByTestId('total').textContent).to.equal('$23');
      expect(screen.getByTestId('cart-renders').textContent).to.equal('2');
    },
  },
  {
    name: 'switching customers remounts the note editor instead of patching it',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.type(screen.getByTestId('note'), 'Happy Birthday');
      await user.click(screen.getByRole('button', { name: 'Switch customer' }));
      expect(screen.getByTestId('customer').textContent).to.equal('bob');
      expect((screen.getByTestId('note') as HTMLInputElement).value).to.equal('');
      expect(screen.getByTestId('note-renders').textContent).to.equal('1');
    },
  },
  {
    name: 'switching back clears the note again, every time',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.click(screen.getByRole('button', { name: 'Switch customer' }));
      await user.type(screen.getByTestId('note'), 'Congrats');
      await user.click(screen.getByRole('button', { name: 'Switch customer' }));
      expect(screen.getByTestId('customer').textContent).to.equal('alice');
      expect((screen.getByTestId('note') as HTMLInputElement).value).to.equal('');
      expect(screen.getByTestId('note-renders').textContent).to.equal('1');
    },
  },
];
