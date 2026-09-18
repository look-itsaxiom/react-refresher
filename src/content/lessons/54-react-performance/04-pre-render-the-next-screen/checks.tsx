import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'step 1 is visible and step 2 is not, on first render',
    run: async ({ render, screen, expect, Component }) => {
      render(<Component />);
      const step1 = screen.getByTestId('step1');
      expect(getComputedStyle(step1).display).to.not.equal('none');
      const step2 = screen.queryByTestId('step2');
      if (step2) expect(getComputedStyle(step2).display).to.equal('none');
    },
  },
  {
    name: "step 2's setup already ran before navigating there",
    run: async ({ render, screen, expect, Component }) => {
      render(<Component />);
      // Still on step 1 — nobody clicked "Next" yet.
      expect(screen.getByTestId('step1')).to.exist;
      const step2 = screen.queryByTestId('step2');
      expect(step2, 'Step2 should already exist (created ahead of time, even if hidden)').to.exist;
      expect(step2!.getAttribute('data-init-count'), 'setup should have run once already').to.equal('1');
    },
  },
  {
    name: 'clicking "Next" flips to step 2 without re-running the setup',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.click(screen.getByRole('button', { name: /next/i }));

      const step1 = screen.getByTestId('step1');
      const step2 = screen.getByTestId('step2');
      expect(getComputedStyle(step2).display).to.not.equal('none');
      expect(getComputedStyle(step1).display).to.equal('none');
      expect(step2.getAttribute('data-init-count'), 'setup must not run a second time').to.equal('1');
    },
  },
];
