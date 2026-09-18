import { useEffect, useRef, useState } from 'react';

type Values = { name: string; email: string; password: string };
type Errors = Partial<Record<keyof Values, string>>;

const FIELDS: Array<{ key: keyof Values; label: string; type: string; autoComplete?: string }> = [
  { key: 'name', label: 'Full name', type: 'text', autoComplete: 'name' },
  { key: 'email', label: 'Email address', type: 'text', autoComplete: 'email' },
  { key: 'password', label: 'Password', type: 'password', autoComplete: 'new-password' },
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
  const [attempt, setAttempt] = useState(0);
  const summaryHeadingRef = useRef<HTMLHeadingElement>(null);

  const erroredFields = FIELDS.filter((f) => errors[f.key]);
  const hasErrors = erroredFields.length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    setSucceeded(Object.keys(nextErrors).length === 0);
    setAttempt((a) => a + 1);
  }

  // Move focus to the summary only right after a failed submit attempt, not on
  // every render where errors happen to be non-empty (e.g. before first submit).
  useEffect(() => {
    if (attempt > 0 && hasErrors) {
      summaryHeadingRef.current?.focus();
    }
  }, [attempt, hasErrors]);

  function focusField(key: keyof Values) {
    const el = document.getElementById(key);
    el?.focus();
  }

  return (
    <main>
      <h1>Create an account</h1>
      {succeeded && <p>Account created.</p>}

      {attempt > 0 && hasErrors && (
        <div role="alert">
          <h2 ref={summaryHeadingRef} tabIndex={-1}>
            There is a problem
          </h2>
          <ul>
            {erroredFields.map((f) => (
              <li key={f.key}>
                <a
                  href={`#${f.key}`}
                  onClick={(e) => {
                    e.preventDefault();
                    focusField(f.key);
                  }}
                >
                  {errors[f.key]}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {FIELDS.map(({ key, label, type, autoComplete }) => (
          <div key={key}>
            <label htmlFor={key}>
              {label} <span>(Required)</span>
            </label>
            <input
              id={key}
              name={key}
              type={type}
              value={values[key]}
              autoComplete={autoComplete}
              aria-required="true"
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              aria-invalid={errors[key] ? true : undefined}
              aria-describedby={errors[key] ? `${key}-error` : undefined}
            />
            {errors[key] && <p id={`${key}-error`}>{errors[key]}</p>}
          </div>
        ))}
        <button type="submit">Create account</button>
      </form>
    </main>
  );
}
