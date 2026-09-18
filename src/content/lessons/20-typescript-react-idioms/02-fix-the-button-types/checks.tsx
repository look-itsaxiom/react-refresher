import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'a Button with onClick renders a real <button> element',
    run: async ({ render, screen, expect, Component }) => {
      render(<Component />);
      const button = screen.getByRole('button', { name: 'Increment counter' });
      expect(button.tagName).to.equal('BUTTON');
    },
  },
  {
    name: 'a Button with href renders an <a> element with that href',
    run: async ({ render, screen, expect, Component }) => {
      render(<Component />);
      const link = screen.getByRole('link', { name: 'Go somewhere link' });
      expect(link.tagName).to.equal('A');
      expect(link.getAttribute('href')).to.equal('/somewhere');
    },
  },
  {
    name: 'clicking the onClick Button calls its handler',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const button = screen.getByRole('button', { name: 'Increment counter' });
      await user.click(button);
      expect(button.textContent).to.match(/Clicked 1 times/);
    },
  },
  {
    name: 'the href Button is never also reachable as a button with that name',
    run: async ({ render, screen, expect, Component }) => {
      render(<Component />);
      expect(screen.queryByRole('button', { name: 'Go somewhere link' })).to.equal(null);
    },
  },
];
