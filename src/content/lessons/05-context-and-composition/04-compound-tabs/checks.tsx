import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'the default tab is selected and its panel is shown',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      const tabs = screen.getAllByRole('tab');
      expect(tabs).to.have.lengthOf(2);
      expect(screen.getByRole('tab', { name: 'Profile' }).getAttribute('aria-selected')).to.equal('true');
      expect(screen.getByRole('tab', { name: 'Settings' }).getAttribute('aria-selected')).to.equal('false');
      expect(screen.getByRole('tabpanel').textContent).to.equal('Profile content');
    },
  },
  {
    name: 'clicking a tab switches the panel and the aria-selected state',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.click(screen.getByRole('tab', { name: 'Settings' }));
      expect(screen.getByRole('tab', { name: 'Settings' }).getAttribute('aria-selected')).to.equal('true');
      expect(screen.getByRole('tab', { name: 'Profile' }).getAttribute('aria-selected')).to.equal('false');
      expect(screen.getByRole('tabpanel').textContent).to.equal('Settings content');
    },
  },
  {
    name: 'only one panel is ever in the document',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      expect(screen.getAllByRole('tabpanel')).to.have.lengthOf(1);
      await user.click(screen.getByRole('tab', { name: 'Settings' }));
      expect(screen.getAllByRole('tabpanel')).to.have.lengthOf(1);
    },
  },
  {
    name: 'clicking back to the first tab restores it',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.click(screen.getByRole('tab', { name: 'Settings' }));
      await user.click(screen.getByRole('tab', { name: 'Profile' }));
      expect(screen.getByRole('tab', { name: 'Profile' }).getAttribute('aria-selected')).to.equal('true');
      expect(screen.getByRole('tabpanel').textContent).to.equal('Profile content');
    },
  },
];
