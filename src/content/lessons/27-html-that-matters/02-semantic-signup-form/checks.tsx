import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'renders a labelled Sign up form with Name and Email fields and a submit button',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      expect(screen.getByRole('form', { name: 'Sign up' }), 'form needs an accessible name').to.exist;
      expect(screen.getByLabelText('Name')).to.exist;
      expect(screen.getByLabelText('Email')).to.have.property('type', 'email');
      expect(screen.getByRole('button', { name: 'Create account' })).to.exist;
    },
  },
  {
    name: 'does not report success while both fields are empty',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.click(screen.getByRole('button', { name: 'Create account' }));
      expect(screen.queryByText('Account created')).to.equal(null);
    },
  },
  {
    name: 'does not report success when the email is not a valid address',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.type(screen.getByLabelText('Name'), 'Chase');
      await user.type(screen.getByLabelText('Email'), 'not-an-email');
      await user.click(screen.getByRole('button', { name: 'Create account' }));
      expect(screen.queryByText('Account created')).to.equal(null);
    },
  },
  {
    name: 'reports success once both fields are filled in validly',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.type(screen.getByLabelText('Name'), 'Chase');
      await user.type(screen.getByLabelText('Email'), 'chase@example.com');
      await user.click(screen.getByRole('button', { name: 'Create account' }));
      expect(screen.getByText('Account created')).to.exist;
    },
  },
];
