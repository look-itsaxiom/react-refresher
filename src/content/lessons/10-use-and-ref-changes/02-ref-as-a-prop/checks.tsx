import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'clicking the button focuses the input',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const input = screen.getByLabelText('Coupon code') as HTMLInputElement;
      await user.click(screen.getByRole('button', { name: 'Focus and select' }));
      expect(document.activeElement).to.equal(input);
    },
  },
  {
    name: 'clicking the button selects the entire input value',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const input = screen.getByLabelText('Coupon code') as HTMLInputElement;
      await user.click(screen.getByRole('button', { name: 'Focus and select' }));
      expect(input.selectionStart).to.equal(0);
      expect(input.selectionEnd).to.equal(input.value.length);
    },
  },
  {
    name: 'still selects correctly after the value changes',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const input = screen.getByLabelText('Coupon code') as HTMLInputElement;
      await user.clear(input);
      await user.type(input, 'HELLO19');
      await user.click(screen.getByRole('button', { name: 'Focus and select' }));
      expect(input.selectionStart).to.equal(0);
      expect(input.selectionEnd).to.equal(7);
    },
  },
];
