import { useState } from 'react';

export default function App() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="signup">
      <div className="legend">Your details</div>
      <div className="field">
        <div className="label">Name</div>
        <input id="name" />
      </div>
      <div className="field">
        <div className="label">Email</div>
        <input id="email" />
      </div>
      {/* Bug: a styled div, not a button — no role, no keyboard activation, no
          form to submit, and no validation before "success" is shown. */}
      <div className="button" onClick={() => setSubmitted(true)}>
        Create account
      </div>
      {submitted && <div>Account created</div>}
    </div>
  );
}
