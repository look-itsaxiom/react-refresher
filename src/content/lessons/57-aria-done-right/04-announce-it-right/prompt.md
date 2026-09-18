This save form works, and a sighted user sees the confirmation text and the error text just
fine. A screen reader user hears almost none of it: the confirmation region doesn't exist until
there's something to say, so it's never actually announced; it's also marked `assertive`, which
is the wrong urgency for a routine save; and the validation error is a plain `<p>` with no live
behavior at all.

Fix `App.tsx` so both messages are announced correctly, without changing the visible layout or
text:

1. **Pre-render the status region.** Instead of only rendering `<div aria-live="assertive">` once
   there's a message, render a single `role="status"` element unconditionally — present in the
   DOM from the start, empty until there's something to announce. `role="status"` already implies
   `aria-live="polite"`, which is the right urgency for "saved successfully."
2. **Make the error an alert.** Give the error paragraph `role="alert"` so it's announced with
   the urgency a failed save deserves. Unlike the status region, it's fine for this one to mount
   fresh only when there's an error — `alert`-role elements are announced on insertion.
3. **Keep it to one region.** There should be exactly one status element in the DOM at any time —
   don't create a new one per save.

The component talks to `@server/todos`'s `addTodo`, which rejects if the server has been told to
fail (via `server.failNext` in the test harness) — you don't need to add any new logic for that,
just make sure the existing catch block's error reaches the alert.
