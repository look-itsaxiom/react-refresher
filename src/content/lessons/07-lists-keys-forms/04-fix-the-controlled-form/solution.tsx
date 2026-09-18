import { useState } from 'react';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function App() {
  // Fix: a real initial value keeps this input controlled from the first render.
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');

  const emailIsValid = EMAIL_PATTERN.test(email);
  const showEmailError = email.length > 0 && !emailIsValid;
  const canSubmit = code.length > 0 && emailIsValid;

  return (
    <form>
      <label>
        Referral code
        <input
          aria-label="Referral code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
      </label>
      <label>
        Email
        <input
          aria-label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      {showEmailError && <p role="alert">Enter a valid email</p>}
      <button type="submit" disabled={!canSubmit}>
        Send invite
      </button>
    </form>
  );
}
