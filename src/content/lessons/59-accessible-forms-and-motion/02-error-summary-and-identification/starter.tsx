import { useState } from 'react';

type Values = { name: string; email: string; password: string };
type Errors = Partial<Record<keyof Values, string>>;

const FIELDS: Array<{ key: keyof Values; label: string; type: string }> = [
  { key: 'name', label: 'Full name', type: 'text' },
  { key: 'email', label: 'Email address', type: 'text' },
  { key: 'password', label: 'Password', type: 'password' },
];

function validate(values: Values): Errors {
  const errors: Errors = {};
  if (!values.name.trim()) {
    errors.name = 'Enter your full name';
  }
  if (!values.email.trim()) {
    errors.email = 'Enter your email address';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = 'Enter an email address in the correct format';
  }
  if (values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }
  return errors;
}

export default function App() {
  const [values, setValues] = useState<Values>({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [succeeded, setSucceeded] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    setSucceeded(Object.keys(nextErrors).length === 0);
  }

  return (
    <main>
      <h1>Create an account</h1>
      {succeeded && <p>Account created.</p>}

      {/* TODO: error summary goes here, after a failed submit. */}

      <form onSubmit={handleSubmit} noValidate>
        {FIELDS.map(({ key, label, type }) => (
          <div key={key}>
            <label htmlFor={key}>{label}</label>
            <input
              id={key}
              name={key}
              type={type}
              value={values[key]}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              aria-invalid={errors[key] ? true : undefined}
              aria-describedby={errors[key] ? `${key}-error` : undefined}
            />
            {errors[key] && (
              <p id={`${key}-error`}>{errors[key]}</p>
            )}
          </div>
        ))}
        <button type="submit">Create account</button>
      </form>
    </main>
  );
}
