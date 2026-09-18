import { waitFor } from '@testing-library/dom';
import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'clicking shows a disabled, aria-busy "Saving…" state that is still visible right after the click resolves',
    run: async ({ render, screen, user, act, expect, Component }) => {
      await act(async () => {
        render(<Component />);
      });
      const button = screen.getByRole('button') as HTMLButtonElement;
      expect(button.textContent).to.equal('Save');

      // The click handler's own event dispatch is synchronous; React flushes whatever
      // state it set before the handler's first `await` as part of that same act() scope.
      // If the handler yields before doing the heavy work, this resolves with the pending
      // render already on screen and the heavy work not yet finished (real busy loops
      // don't finish inside a microtask flush). If it doesn't yield, the whole handler —
      // heavy work included — runs synchronously inside the click, and this already shows
      // "Saved" by the time we get here.
      await act(async () => {
        await user.click(button);
      });

      expect(button.getAttribute('aria-busy'), 'aria-busy while pending').to.equal('true');
      expect(button.disabled, 'disabled while pending').to.equal(true);
      expect(button.textContent, 'label while pending').to.equal('Saving…');
    },
  },
  {
    name: 'the work eventually finishes: the button reads "Saved" and re-enables',
    run: async ({ render, screen, user, act, expect, Component }) => {
      await act(async () => {
        render(<Component />);
      });
      const button = screen.getByRole('button') as HTMLButtonElement;

      await act(async () => {
        await user.click(button);
      });

      await waitFor(() => expect(button.textContent).to.equal('Saved'), { timeout: 2000 });
      expect(button.disabled, 'enabled again after saving').to.equal(false);
      expect(button.getAttribute('aria-busy'), 'aria-busy cleared after saving').to.equal('false');
    },
  },
  {
    name: 'yields at least once per chunk (20 items in chunks of 4 is 5 chunks) plus the initial yield',
    run: async ({ render, screen, user, act, expect, mod, Component }) => {
      await act(async () => {
        render(<Component />);
      });
      const button = screen.getByRole('button') as HTMLButtonElement;

      await act(async () => {
        await user.click(button);
      });
      await waitFor(() => expect(button.textContent).to.equal('Saved'), { timeout: 2000 });

      expect(mod.yieldCount as number).to.be.at.least(5);
    },
  },
];
