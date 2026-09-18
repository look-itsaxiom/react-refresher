import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'starts with submit disabled and no error message visible',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      expect(screen.getByRole('button', { name: 'Send invite' })).to.have.property('disabled', true);
      expect(screen.queryByText('Enter a valid email')).to.equal(null);
    },
  },
  {
    name: 'typing lowercase into the referral code shows uppercase as you type',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const codeInput = screen.getByLabelText('Referral code');
      await user.type(codeInput, 'abc123');
      expect(codeInput).to.have.property('value', 'ABC123');
    },
  },
  {
    name: 'an invalid email shows a live error, which clears once the address is valid',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const emailInput = screen.getByLabelText('Email');

      await user.type(emailInput, 'not-an-email');
      expect(screen.getByText('Enter a valid email')).to.exist;

      await user.clear(emailInput);
      await user.type(emailInput, 'person@example.com');
      expect(screen.queryByText('Enter a valid email')).to.equal(null);
    },
  },
  {
    name: 'submit only enables once both the code is present and the email is valid',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      const codeInput = screen.getByLabelText('Referral code');
      const emailInput = screen.getByLabelText('Email');
      const submit = screen.getByRole('button', { name: 'Send invite' });

      await user.type(emailInput, 'person@example.com');
      expect(submit, 'code is still empty').to.have.property('disabled', true);

      await user.type(codeInput, 'friend');
      expect(submit, 'both fields are now valid').to.have.property('disabled', false);

      await user.clear(emailInput);
      await user.type(emailInput, 'nope');
      expect(submit, 'email became invalid again').to.have.property('disabled', true);
    },
  },
];
