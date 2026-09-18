import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'opening the drawer moves focus to the first focusable element inside it (Close)',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.click(screen.getByRole('button', { name: 'Open settings' }));
      expect(document.activeElement).to.equal(screen.getByRole('button', { name: 'Close' }));
    },
  },
  {
    name: 'Tab cycles within the drawer and wraps from the last focusable element back to the first',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.click(screen.getByRole('button', { name: 'Open settings' }));

      const close = screen.getByRole('button', { name: 'Close' });
      const input = screen.getByLabelText('Display name');
      const save = screen.getByRole('button', { name: 'Save' });

      expect(document.activeElement).to.equal(close);
      await user.tab();
      expect(document.activeElement).to.equal(input);
      await user.tab();
      expect(document.activeElement).to.equal(save);
      await user.tab();
      expect(document.activeElement, 'Tab from the last item should wrap back to the first').to.equal(close);
    },
  },
  {
    name: 'Shift+Tab from the first focusable element wraps to the last, and never leaves the drawer',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.click(screen.getByRole('button', { name: 'Open settings' }));

      const close = screen.getByRole('button', { name: 'Close' });
      const save = screen.getByRole('button', { name: 'Save' });

      expect(document.activeElement).to.equal(close);
      await user.tab({ shift: true });
      expect(document.activeElement, 'Shift+Tab from the first item should wrap to the last').to.equal(save);
    },
  },
  {
    name: 'Escape closes the drawer and returns focus to the button that opened it',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const opener = screen.getByRole('button', { name: 'Open settings' });
      await user.click(opener);
      expect(screen.getByRole('button', { name: 'Close' })).to.exist;

      await user.keyboard('{Escape}');

      expect(screen.queryByRole('button', { name: 'Close' }), 'the drawer should be gone after Escape').to.equal(null);
      expect(document.activeElement, 'focus should return to the opener button').to.equal(opener);
    },
  },
  {
    name: 'clicking Close also returns focus to the opener',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const opener = screen.getByRole('button', { name: 'Open settings' });
      await user.click(opener);
      await user.click(screen.getByRole('button', { name: 'Close' }));

      expect(screen.queryByRole('button', { name: 'Close' })).to.equal(null);
      expect(document.activeElement).to.equal(opener);
    },
  },
  {
    name: 'the rest of the page is hidden from assistive tech while the drawer is open, and reachable again once closed',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const other = screen.getByText('Other page action');

      expect(
        other.closest('[aria-hidden="true"]') ?? other.closest('[inert]'),
        'before opening, the background should not be hidden',
      ).to.equal(null);

      await user.click(screen.getByRole('button', { name: 'Open settings' }));

      expect(
        other.closest('[aria-hidden="true"]') ?? other.closest('[inert]'),
        'while the drawer is open, mark the background aria-hidden and/or inert',
      ).to.exist;

      await user.keyboard('{Escape}');

      expect(
        other.closest('[aria-hidden="true"]') ?? other.closest('[inert]'),
        'after closing, the background should be reachable again',
      ).to.equal(null);
    },
  },
];
