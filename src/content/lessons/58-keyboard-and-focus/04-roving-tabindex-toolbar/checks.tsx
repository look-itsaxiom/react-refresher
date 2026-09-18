import type { Check } from '../../../types';

const TOOL_NAMES = ['Bold', 'Italic', 'Underline', 'Strikethrough', 'Code'];

function tabIndicesOf(buttons: HTMLElement[]) {
  return buttons.map((button) => button.getAttribute('tabindex'));
}

export const checks: Check[] = [
  {
    name: 'a single Tab from the top of the page enters the toolbar on the first button (Bold)',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      document.body.focus();
      await user.tab();
      expect(document.activeElement).to.equal(screen.getByRole('button', { name: 'Bold' }));
    },
  },
  {
    name: 'ArrowRight moves real focus to the next button, wrapping from the last back to the first',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      document.body.focus();
      await user.tab();

      await user.keyboard('{ArrowRight}');
      expect(document.activeElement).to.equal(screen.getByRole('button', { name: 'Italic' }));

      await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');
      expect(document.activeElement).to.equal(screen.getByRole('button', { name: 'Code' }));

      await user.keyboard('{ArrowRight}');
      expect(document.activeElement, 'ArrowRight from the last button should wrap to the first').to.equal(
        screen.getByRole('button', { name: 'Bold' }),
      );
    },
  },
  {
    name: 'Home and End jump straight to the first and last button',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      document.body.focus();
      await user.tab();

      await user.keyboard('{End}');
      expect(document.activeElement).to.equal(screen.getByRole('button', { name: 'Code' }));

      await user.keyboard('{Home}');
      expect(document.activeElement).to.equal(screen.getByRole('button', { name: 'Bold' }));
    },
  },
  {
    name: 'Tab leaves the toolbar entirely, landing on the title input next',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      document.body.focus();
      await user.tab();
      await user.keyboard('{ArrowRight}');

      await user.tab();
      expect(document.activeElement).to.equal(screen.getByLabelText('Document title'));
    },
  },
  {
    name: 'the last-active button is remembered: Shift+Tab back into the toolbar returns to it, not to Bold',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      document.body.focus();
      await user.tab();
      await user.keyboard('{ArrowRight}{ArrowRight}'); // Bold -> Italic -> Underline

      await user.tab(); // leaves toolbar onto the input
      expect(document.activeElement).to.equal(screen.getByLabelText('Document title'));

      await user.tab({ shift: true }); // back into the toolbar
      expect(document.activeElement, 'should return to the remembered active button (Underline)').to.equal(
        screen.getByRole('button', { name: 'Underline' }),
      );
    },
  },
  {
    name: 'exactly one button has tabindex="0" at all times, and it tracks the active button',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const buttons = TOOL_NAMES.map((name) => screen.getByRole('button', { name }));

      expect(tabIndicesOf(buttons).filter((v) => v === '0')).to.have.lengthOf(1);
      expect(buttons[0]!.getAttribute('tabindex'), 'Bold should start as the active button').to.equal('0');

      document.body.focus();
      await user.tab();
      await user.keyboard('{ArrowRight}{ArrowRight}'); // now on Underline

      const afterMove = tabIndicesOf(buttons);
      expect(afterMove.filter((v) => v === '0')).to.have.lengthOf(1);
      expect(buttons[2]!.getAttribute('tabindex'), 'Underline should now be the only tabindex="0" button').to.equal('0');
      expect(buttons[0]!.getAttribute('tabindex'), 'Bold should no longer be tabindex="0"').to.equal('-1');
    },
  },
  {
    name: 'clicking a button toggles its own aria-pressed without moving the active/tabindex position',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const italic = screen.getByRole('button', { name: 'Italic' });
      expect(italic.getAttribute('aria-pressed')).to.equal('false');

      await user.click(italic);
      expect(italic.getAttribute('aria-pressed')).to.equal('true');

      // Clicking Italic (not Bold) should not have made Italic the roving-tabindex active button.
      expect(screen.getByRole('button', { name: 'Bold' }).getAttribute('tabindex')).to.equal('0');
      expect(italic.getAttribute('tabindex')).to.equal('-1');
    },
  },
];
