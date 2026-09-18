import { useState } from 'react';

export default function App() {
  // Bug: no initial value, so this input starts uncontrolled and then
  // "becomes" controlled the moment state is first set.
  const [code, setCode] = useState<string>();
  const [email, setEmail] = useState('');

  return (
    <form>
      <label>
        Referral code
        <input
          aria-label="Referral code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
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
      <button type="submit">Send invite</button>
    </form>
  );
}
