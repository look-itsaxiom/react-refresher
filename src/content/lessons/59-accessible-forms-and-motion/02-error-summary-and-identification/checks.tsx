import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'nothing is focused via the summary before the first submit attempt',
    run: async ({ render, expect, Component }) => {
      render(<Component />);
      expect(document.activeElement === document.body || document.activeElement === null).to.equal(
        true,
        'no field or heading should be programmatically focused before a submit attempt',
      );
    },
  },
  {
    name: 'a failed submit renders an alert with a list of links targeting each invalid field',
    run: async ({ render, screen, within, user, expect, Component }) => {
      render(<Component />);
      await user.click(screen.getByRole('button', { name: /create account/i }));
      const alert = await screen.findByRole('alert', undefined, { timeout: 2000 });
      const list = within(alert).getByRole('list');
      const links = within(list).getAllByRole('link');
      expect(links.length, 'expected one link per invalid field').to.be.at.least(3);
      const hrefs = links.map((l) => l.getAttribute('href'));
      expect(hrefs).to.include('#name');
      expect(hrefs).to.include('#email');
      expect(hrefs).to.include('#password');
    },
  },
  {
    name: 'focus moves to the summary heading (tabindex -1) right after a failed submit',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.click(screen.getByRole('button', { name: /create account/i }));
      const heading = await screen.findByRole('heading', { name: /problem/i }, { timeout: 2000 });
      expect(heading.getAttribute('tabindex'), 'the summary heading must be tabIndex={-1}').to.equal('-1');
      expect(document.activeElement).to.equal(heading);
    },
  },
  {
    name: 'clicking a summary link focuses the corresponding input, not just navigates',
    run: async ({ render, screen, within, user, expect, Component }) => {
      render(<Component />);
      await user.click(screen.getByRole('button', { name: /create account/i }));
      const alert = await screen.findByRole('alert', undefined, { timeout: 2000 });
      const emailLink = within(alert).getByRole('link', { name: /email/i });
      await user.click(emailLink);
      expect(document.activeElement).to.equal(screen.getByLabelText(/email address/i));
    },
  },
  {
    name: 'name and email inputs carry the correct autocomplete tokens',
    run: async ({ render, screen, expect, Component }) => {
      render(<Component />);
      expect(screen.getByLabelText(/full name/i).getAttribute('autocomplete')).to.equal('name');
      expect(screen.getByLabelText(/email address/i).getAttribute('autocomplete')).to.equal('email');
    },
  },
  {
    name: 'required fields are marked with aria-required and a visible text indicator, not color alone',
    run: async ({ render, screen, expect, Component }) => {
      render(<Component />);
      for (const labelText of [/full name/i, /email address/i, /password/i]) {
        const input = screen.getByLabelText(labelText);
        expect(input.getAttribute('aria-required'), `${labelText} should have aria-required="true"`).to.equal('true');
        const group = input.closest('div');
        expect(group, 'expected the field to be wrapped in a container').to.exist;
        expect(group!.textContent, 'expected visible text (not just color) indicating the field is required').to.match(/required/i);
      }
    },
  },
  {
    name: 'a successful submit shows the success message and no error summary',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.type(screen.getByLabelText(/full name/i), 'Ada Lovelace');
      await user.type(screen.getByLabelText(/email address/i), 'ada@example.com');
      await user.type(screen.getByLabelText(/password/i), 'longenough1');
      await user.click(screen.getByRole('button', { name: /create account/i }));
      await screen.findByText(/account created/i, undefined, { timeout: 2000 });
      expect(screen.queryByRole('alert')).to.equal(null);
    },
  },
];
