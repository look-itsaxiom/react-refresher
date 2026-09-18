import type { Check } from '../../../types';

const QUESTIONS = [
  'What is a headless component?',
  'Why not build ARIA myself?',
  'What does aria-activedescendant do?',
];

export const checks: Check[] = [
  {
    name: 'each question is a button inside a heading, and every panel starts collapsed',
    run: async ({ render, screen, expect, Component }) => {
      render(<Component />);
      const buttons = QUESTIONS.map((question) => screen.getByRole('button', { name: question }));
      for (const button of buttons) {
        expect(button.closest('h1,h2,h3,h4,h5,h6'), `"${button.textContent}" should be inside a heading element`).to
          .not.be.null;
        expect(button.getAttribute('aria-expanded')).to.equal('false');
      }
    },
  },
  {
    name: 'a collapsed panel is still in the DOM (findable via its button\'s aria-controls) but hidden, and not found by a plain role query',
    run: async ({ render, screen, expect, Component }) => {
      render(<Component />);
      const button = screen.getByRole('button', { name: QUESTIONS[1] });
      const panelId = button.getAttribute('aria-controls');
      expect(panelId, 'the button should have aria-controls pointing at its panel').to.be.a('string');

      expect(screen.queryByRole('region', { name: QUESTIONS[1] })).to.equal(null);
      const panel = document.getElementById(panelId!);
      expect(panel, 'the panel should still exist in the DOM while collapsed').to.not.equal(null);
      expect(panel!.getAttribute('role')).to.equal('region');
      expect(panel!.getAttribute('aria-labelledby')).to.equal(button.id);
      expect((panel as HTMLElement).hidden).to.equal(true);
    },
  },
  {
    name: 'clicking a header expands it: aria-expanded flips true and its region becomes visible and queryable by name',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const button = screen.getByRole('button', { name: QUESTIONS[0] });
      await user.click(button);

      expect(button.getAttribute('aria-expanded')).to.equal('true');
      const region = screen.getByRole('region', { name: QUESTIONS[0] });
      expect((region as HTMLElement).hidden, 'the region should no longer be hidden once expanded').to.equal(false);
    },
  },
  {
    name: 'opening one header does not collapse another by default',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.click(screen.getByRole('button', { name: QUESTIONS[0] }));
      await user.click(screen.getByRole('button', { name: QUESTIONS[1] }));

      expect(screen.getByRole('button', { name: QUESTIONS[0] }).getAttribute('aria-expanded')).to.equal('true');
      expect(screen.getByRole('button', { name: QUESTIONS[1] }).getAttribute('aria-expanded')).to.equal('true');
    },
  },
  {
    name: 'ArrowDown and ArrowUp move real focus between header buttons',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const first = screen.getByRole('button', { name: QUESTIONS[0] });
      const second = screen.getByRole('button', { name: QUESTIONS[1] });
      first.focus();

      await user.keyboard('{ArrowDown}');
      expect(document.activeElement).to.equal(second);

      await user.keyboard('{ArrowUp}');
      expect(document.activeElement).to.equal(first);
    },
  },
  {
    name: 'Home and End jump to the first and last header button',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const first = screen.getByRole('button', { name: QUESTIONS[0] });
      const last = screen.getByRole('button', { name: QUESTIONS[2] });
      first.focus();

      await user.keyboard('{End}');
      expect(document.activeElement).to.equal(last);

      await user.keyboard('{Home}');
      expect(document.activeElement).to.equal(first);
    },
  },
];
