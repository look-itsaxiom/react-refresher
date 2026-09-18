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

// TODO: run each field's validators in order; the first non-null message is that field's error.
export function validate(
  values: Record<string, string>,
  fieldRules: Rules,
): { ok: boolean; errors: Record<string, string> } {
  return { ok: true, errors: {} };
}

export default function App() {
  const [values, setValues] = useState({ name: '', email: '' });
  const [submitted, setSubmitted] = useState(false);
  const { ok } = validate(values, rules);

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
          />
        </div>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            value={values.email}
            onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
          />
        </div>
        <button type="submit">Create account</button>
      </form>
      {submitted && ok && <p role="status">Welcome, {values.name}!</p>}
    </main>
  );
}
