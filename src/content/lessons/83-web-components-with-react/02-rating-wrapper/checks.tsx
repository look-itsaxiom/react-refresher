import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'the value prop is set as a real property on the <x-rating> element, not stringified into an attribute',
    run: async ({ render, screen, expect, Component }) => {
      render(<Component />);
      const el = screen.getByTestId('rating') as unknown as { value: number };
      expect(typeof el.value).to.equal('number');
      expect(el.value).to.equal(2);
    },
  },
  {
    name: 'dispatching a rating-change CustomEvent on the element calls onChange and updates the displayed value',
    run: async ({ render, screen, act, expect, Component }) => {
      render(<Component />);
      const el = screen.getByTestId('rating');
      await act(async () => {
        el.dispatchEvent(new CustomEvent('rating-change', { detail: { value: 4 }, bubbles: true }));
      });
      expect(screen.getByText('Current: 4')).to.exist;
    },
  },
  {
    name: 'clicking Reset calls the element\'s reset() method through the ref',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const el = screen.getByTestId('rating') as unknown as { reset: () => void };
      let resetCalls = 0;
      const originalReset = el.reset.bind(el);
      el.reset = () => {
        resetCalls += 1;
        originalReset();
      };
      await user.click(screen.getByRole('button', { name: 'Reset' }));
      expect(resetCalls).to.equal(1);
      expect(screen.getByText('Current: 0')).to.exist;
    },
  },
  {
    name: 'unmounting removes the rating-change listener from the element',
    run: async ({ render, screen, expect, Component }) => {
      const result = render(<Component />);
      const el = screen.getByTestId('rating') as unknown as {
        removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
      };
      const removedTypes: string[] = [];
      const originalRemove = el.removeEventListener.bind(el);
      el.removeEventListener = (type, listener) => {
        removedTypes.push(type);
        originalRemove(type, listener);
      };
      result.unmount();
      expect(removedTypes).to.include('rating-change');
    },
  },
];
