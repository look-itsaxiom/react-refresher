import { useState, type FormEvent } from 'react';

export default function App() {
  const [result, setResult] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // The browser already refuses to fire this submit event at all while the
    // form is invalid, but checking explicitly is what makes that guarantee
    // visible in the code (and keeps this correct if something ever calls
    // `form.requestSubmit()` programmatically, which skips that native gate).
    if (event.currentTarget.checkValidity()) {
      setResult('Account created');
    }
  }

  return (
    <form aria-label="Sign up" onSubmit={handleSubmit}>
      <fieldset>
        <legend>Your details</legend>
        <label>
          Name
          <input required />
        </label>
        <label>
          Email
          <input type="email" required />
        </label>
      </fieldset>
      <button type="submit">Create account</button>
      <output>{result}</output>
    </form>
  );
}
