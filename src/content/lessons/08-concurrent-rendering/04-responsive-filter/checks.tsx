import { fireEvent, waitFor } from '@testing-library/dom';
import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'shows the default 25 items with data-pending="false" on mount',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      const list = screen.getByRole('list');
      expect(list.getAttribute('data-pending')).to.equal('false');
      expect(list.children.length).to.equal(25);
    },
  },
  {
    name: 'the input reflects every keystroke immediately, even while a filter is in flight',
    run: async ({ render, screen, expect, act, Component }) => {
      render(<Component />);
      const input = screen.getByRole('textbox', { name: 'Search widgets' }) as HTMLInputElement;
      await act(async () => {
        fireEvent.change(input, { target: { value: 'Widget #7' } });
      });
      expect(input.value).to.equal('Widget #7');
    },
  },
  {
    name: 'marks the list as pending while filtering, then clears it once results land',
    run: async ({ render, screen, expect, act, Component }) => {
      render(<Component />);
      const input = screen.getByRole('textbox', { name: 'Search widgets' });
      const list = screen.getByRole('list');
      await act(async () => {
        fireEvent.change(input, { target: { value: 'Widget #7' } });
      });
      expect(list.getAttribute('data-pending'), 'while filtering').to.equal('true');
      await waitFor(() => expect(list.getAttribute('data-pending'), 'after filtering').to.equal('false'), {
        timeout: 2000,
      });
    },
  },
  {
    name: 'applies the matching results once the filter resolves',
    run: async ({ render, screen, expect, act, Component }) => {
      render(<Component />);
      const input = screen.getByRole('textbox', { name: 'Search widgets' });
      await act(async () => {
        fireEvent.change(input, { target: { value: 'Widget #7' } });
      });
      await waitFor(
        () => {
          const list = screen.getByRole('list');
          const texts = Array.from(list.children).map((li) => li.textContent);
          expect(texts.every((t) => t?.includes('7')), 'every visible item should match the query').to.equal(true);
          expect(texts.length).to.be.greaterThan(0);
        },
        { timeout: 2000 },
      );
    },
  },
];
