import { useState, type FormEvent } from 'react';

type Rules = Record<string, Array<(value: string) => string | null>>;

const required = (message: string) => (value: string) => (value.trim() ? null : message);
const minLength = (n: number, message: string) => (value: string) =>
  value.trim().length >= n ? null : message;
const isEmail = (message: string) => (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : message;

const rules: Rules = {
  name: [required('Name is required'), minLength(2, 'Name must be at least 2 characters')],
  email: [required('Email is required'), isEmail('Enter a valid email address')],
};

export function validate(
  values: Record<string, string>,
  fieldRules: Rules,
): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  for (const field of Object.keys(fieldRules)) {
    for (const check of fieldRules[field] ?? []) {
      const message = check(values[field] ?? '');
      if (message) {
        errors[field] = message;
        break;
      }
    }
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export default function App() {
  const [values, setValues] = useState({ name: '', email: '' });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const { ok, errors } = validate(values, rules);

  function errorFor(field: string) {
    return touched[field] || submitted ? errors[field] : undefined;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <main>
      <form onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="name">Name</label>
          <input
            id="name"
            value={values.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            aria-invalid={errorFor('name') ? true : undefined}
          />
          {errorFor('name') && <p role="alert">{errorFor('name')}</p>}
        </div>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            value={values.email}
            onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            aria-invalid={errorFor('email') ? true : undefined}
          />
          {errorFor('email') && <p role="alert">{errorFor('email')}</p>}
        </div>
        <button type="submit" aria-disabled={!ok}>
          Create account
        </button>
      </form>
      {submitted && ok && <p role="status">Welcome, {values.name}!</p>}
    </main>
  );
}
