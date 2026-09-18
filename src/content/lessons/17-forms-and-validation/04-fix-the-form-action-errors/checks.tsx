import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'surfaces the server\'s blank-title rejection as a title error and keeps the typed owner',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.type(screen.getByLabelText('Owner'), 'Alice');
      await user.click(screen.getByRole('button', { name: /add/i }));
      const alert = await screen.findByRole('alert', undefined, { timeout: 2000 });
      expect(alert.textContent).to.match(/required/i);
      expect((screen.getByLabelText('Owner') as HTMLInputElement).value).to.equal('Alice');
    },
  },
  {
    name: 'rejects a too-long title client-side and keeps the typed value',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const longTitle = 'x'.repeat(50);
      await user.type(screen.getByLabelText('Title'), longTitle);
      await user.type(screen.getByLabelText('Owner'), 'Bob');
      await user.click(screen.getByRole('button', { name: /add/i }));
      const alert = await screen.findByRole('alert', undefined, { timeout: 2000 });
      expect(alert.textContent).to.match(/40|fewer|long/i);
      expect((screen.getByLabelText('Title') as HTMLInputElement).value).to.equal(longTitle);
      expect(screen.queryByText(longTitle, { selector: 'li' })).to.equal(null);
    },
  },
  {
    name: 'preserves a valid title and shows an owner-required error when owner is blank',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.type(screen.getByLabelText('Title'), 'Buy milk');
      await user.click(screen.getByRole('button', { name: /add/i }));
      const alert = await screen.findByRole('alert', undefined, { timeout: 2000 });
      expect(alert.textContent).to.match(/owner/i);
      expect((screen.getByLabelText('Title') as HTMLInputElement).value).to.equal('Buy milk');
    },
  },
  {
    name: 'associates the visible error with its field via aria-describedby',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.type(screen.getByLabelText('Title'), 'Buy milk');
      await user.click(screen.getByRole('button', { name: /add/i }));
      const ownerInput = await screen.findByLabelText('Owner');
      const describedBy = ownerInput.getAttribute('aria-describedby');
      expect(describedBy, 'owner input should have aria-describedby set while its error shows').to.be.a('string');
      const description = document.getElementById(describedBy as string);
      expect(description, 'the aria-describedby id should point at an element that exists').to.not.equal(null);
      expect(description?.textContent).to.match(/owner/i);
    },
  },
  {
    name: 'adds the todo and clears both fields on a valid submission',
    run: async ({ render, screen, user, expect, server, Component }) => {
      server.setLatency(20);
      render(<Component />);
      await user.type(screen.getByLabelText('Title'), 'Buy milk');
      await user.type(screen.getByLabelText('Owner'), 'Alice');
      await user.click(screen.getByRole('button', { name: /add/i }));
      await screen.findByText('Buy milk', { selector: 'li' }, { timeout: 2000 });
      expect((screen.getByLabelText('Title') as HTMLInputElement).value).to.equal('');
      expect((screen.getByLabelText('Owner') as HTMLInputElement).value).to.equal('');
      expect(screen.queryByRole('alert')).to.equal(null);
    },
  },
];
