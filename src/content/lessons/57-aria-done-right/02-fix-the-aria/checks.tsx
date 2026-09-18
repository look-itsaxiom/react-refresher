import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'the toggle is a real button, starts collapsed, and expands on click',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const toggle = screen.getByRole('button', { name: 'Notifications', expanded: false });
      expect(toggle.tagName, 'the toggle should be a real <button>').to.equal('BUTTON');

      await user.click(toggle);
      expect(screen.getByRole('button', { name: 'Notifications', expanded: true })).to.exist;
    },
  },
  {
    name: 'the panel is exposed as a named region once open, connected to the toggle',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const toggle = screen.getByRole('button', { name: 'Notifications' });
      await user.click(toggle);

      const region = screen.getByRole('region', { name: 'Notifications' });
      expect(region).to.exist;
      expect(
        toggle.getAttribute('aria-controls'),
        'the toggle needs aria-controls pointing at the panel id',
      ).to.equal(region.id);
    },
  },
  {
    name: 'the mute control is a switch, not a button, and toggles by click and by keyboard',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.click(screen.getByRole('button', { name: 'Notifications' }));

      const switchEl = screen.getByRole('switch', { name: 'Mute', checked: false });
      expect(switchEl.tagName, 'the switch should be a real, focusable element').to.equal('BUTTON');

      await user.click(switchEl);
      expect(screen.getByRole('switch', { name: 'Mute', checked: true })).to.exist;

      switchEl.focus();
      await user.keyboard(' ');
      expect(screen.getByRole('switch', { name: 'Mute', checked: false })).to.exist;
    },
  },
  {
    name: 'no element carries a redundant role that duplicates its native one',
    run: async ({ render, screen, user, expect, Component }) => {
      const { container } = render(<Component />);
      await user.click(screen.getByRole('button', { name: 'Notifications' }));
      expect(container.querySelectorAll('button[role="button"]')).to.have.lengthOf(0);
    },
  },
  {
    name: 'the "Mute" label text no longer relies on aria-label on a bare div',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.click(screen.getByRole('button', { name: 'Notifications' }));
      // The switch must have a real accessible name of "Mute" via labelling, not a dead aria-label.
      expect(screen.getByRole('switch', { name: 'Mute' })).to.exist;
      const deadLabel = document.querySelector('div[aria-label="Mute notifications"]');
      expect(deadLabel, 'remove the aria-label from the plain div — it has no effect there').to.be.null;
    },
  },
];
