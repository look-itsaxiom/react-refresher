import type { Check } from '../../../types';

const rules = {
  name: [
    (v: string) => (v.trim() ? null : 'Name is required'),
    (v: string) => (v.trim().length >= 2 ? null : 'Name must be at least 2 characters'),
  ],
  email: [
    (v: string) => (v.trim() ? null : 'Email is required'),
    (v: string) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Enter a valid email address'),
  ],
};

export const checks: Check[] = [
  {
    name: 'validate() returns ok:true and no errors for valid values',
    run: async ({ mod, expect }) => {
      const result = (mod.validate as (v: Record<string, string>, r: typeof rules) => { ok: boolean; errors: Record<string, string> })(
        { name: 'Ada Lovelace', email: 'ada@example.com' },
        rules,
      );
      expect(result.ok).to.equal(true);
      expect(Object.keys(result.errors)).to.have.lengthOf(0);
    },
  },
  {
    name: 'validate() reports a name error and no email error when only name is invalid',
    run: async ({ mod, expect }) => {
      const validate = mod.validate as (v: Record<string, string>, r: typeof rules) => { ok: boolean; errors: Record<string, string> };
      const result = validate({ name: '', email: 'ada@example.com' }, rules);
      expect(result.ok).to.equal(false);
      expect(result.errors.name).to.be.a('string').and.not.equal('');
      expect(result.errors.email).to.equal(undefined);
    },
  },
  {
    name: 'validate() reports an email error for a malformed address',
    run: async ({ mod, expect }) => {
      const validate = mod.validate as (v: Record<string, string>, r: typeof rules) => { ok: boolean; errors: Record<string, string> };
      const result = validate({ name: 'Ada Lovelace', email: 'not-an-email' }, rules);
      expect(result.ok).to.equal(false);
      expect(result.errors.email).to.be.a('string').and.not.equal('');
    },
  },
  {
    name: 'shows a field error after that field is blurred, but not before',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      expect(screen.queryByRole('alert')).to.equal(null);
      await user.click(screen.getByLabelText('Email'));
      await user.tab(); // blur email, leave it empty
      const alert = await screen.findByRole('alert');
      expect(alert.textContent).to.match(/email/i);
      // Name was never touched, so it should not have an error shown yet.
      expect(screen.getAllByRole('alert')).to.have.lengthOf(1);
    },
  },
  {
    name: 'clears the error and enables the button once a field becomes valid',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.type(screen.getByLabelText('Name'), 'Ada');
      await user.type(screen.getByLabelText('Email'), 'ada@example.com');
      expect(screen.queryByRole('alert')).to.equal(null);
      const button = screen.getByRole('button', { name: 'Create account' });
      expect(button.getAttribute('aria-disabled')).to.not.equal('true');
    },
  },
  {
    name: 'clicking submit while invalid reveals errors for every untouched invalid field',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      // Never blur or touch either field; go straight for submit.
      await user.click(screen.getByRole('button', { name: 'Create account' }));
      const alerts = await screen.findAllByRole('alert');
      expect(alerts.length).to.be.greaterThan(0);
      const text = alerts.map((a) => a.textContent).join(' ');
      expect(text).to.match(/name/i);
      expect(text).to.match(/email/i);
      expect(screen.queryByRole('status')).to.equal(null);
    },
  },
];
