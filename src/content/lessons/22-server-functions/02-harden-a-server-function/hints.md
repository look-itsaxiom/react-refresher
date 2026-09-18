Start with the auth check: `if (!session) return { ...prevState, errors: { auth: '...' } };` at the very top of the function, before touching `formData` at all.

---

Validate the title the way lesson 3's `submit` did: trim it, and short-circuit with a field error if it's empty, keeping the previous todos in state.

---

Wrap the `addTodo` call in `try/catch` and put the caught message into `errors` instead of letting the exception propagate — a Server Function's contract is "always returns a result," never "might throw."

---

Delete the hidden `userId` input and any place the action reads `formData.get('userId')`. The action already has the true identity in `session` — a form field is only something the client claims, never proof.
