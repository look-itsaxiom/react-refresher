Move the status `<div>` outside the `{status && ...}` condition — render it every time, and let
only its *text content* be empty or not. A live region that gets created fresh each time a
message appears usually isn't announced at all; one that already exists and has its text mutated
is.

---

`role="status"` already carries an implicit `aria-live="polite"`, so once the div is
unconditionally rendered you can drop the manual `aria-live="assertive"` entirely.

---

The error paragraph needs `role="alert"` added to it. It's fine to leave it conditionally
rendered (`{error && <p role="alert">...}`) — `alert`-role elements, unlike `status`, are
announced on insertion into the DOM, so mounting a fresh one on each error still works.

---

Double check that a failed save clears any leftover status text (and a successful save clears any
leftover error) — otherwise a user could end up with a stale confirmation still sitting in the
status region next to a new error.

---

Full shape:

```tsx
async function handleSave() {
  setError('');
  try {
    await addTodo(title);
    setStatus(`Saved "${title}"`);
    setTitle('');
  } catch (e) {
    setStatus('');
    setError((e as Error).message);
  }
}

// ...
<div role="status">{status}</div>
{error && <p role="alert">{error}</p>}
```
