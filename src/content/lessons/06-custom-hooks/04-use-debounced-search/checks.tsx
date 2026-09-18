import { waitFor } from '@testing-library/dom';
import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'typing updates the input immediately',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const input = screen.getByRole('textbox', { name: /search fruit/i });
      await user.type(input, 'kiwi');
      expect((input as HTMLInputElement).value).to.equal('kiwi');
    },
  },
  {
    name: 'the filtered list only updates after the debounce delay',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const input = screen.getByRole('textbox', { name: /search fruit/i });
      await user.type(input, 'kiwi');
      // Right after typing, the list should still reflect the pre-typing (empty) query.
      expect(screen.queryByText('Apple')).to.exist;
      await waitFor(
        () => {
          expect(screen.queryByText('Apple')).to.equal(null);
          expect(screen.getByText('Kiwi')).to.exist;
        },
        { timeout: 2000 },
      );
    },
  },
  {
    name: 'unmounting while a debounce is pending does not throw',
    run: async ({ render, screen, user, Component, sleep }) => {
      const { unmount } = render(<Component />);
      const input = screen.getByRole('textbox', { name: /search fruit/i });
      await user.type(input, 'mango');
      unmount();
      await sleep(400);
    },
  },
];
