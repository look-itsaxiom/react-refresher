Buffer decoded text as it arrives and look for `\n\n` (after normalizing `\r\n` to `\n`) to find
frame boundaries. Don't forget to flush whatever's left in the buffer when the stream ends,
even if it doesn't end in a blank line.

---

Within one frame, split on `\n`, skip empty lines and lines starting with `:`, and collect every
`data:` line's value (trim one leading space if present) into an array you join with `\n` at the
end. Track an `event:` line the same way, as a single value.

---

For the hook, give each run its own `AbortController` and store it in a ref so `stop()` can
reach the current one. Use a plain string or object id per message (`` `a${Date.now()}` `` is
fine) so your `setMessages` updates can find and update the right message by id as events
arrive.

---

Don't try to distinguish "stream ended because of abort" from "stream ended normally" by
catching an error — depending on how the underlying stream is implemented, an abort may just
close the stream rather than reject a read. Instead, track whether you received a `done` event;
if the `for await` loop over `parseSSE` finishes without one, mark the message `'stopped'`.

---

Near-solution shape for the streaming loop:

```ts
let done = false;
try {
  for await (const frame of parseSSE(stream)) {
    if (!frame.data) continue;
    const evt = JSON.parse(frame.data) as ChatEvent;
    if (evt.type === 'text-delta') {
      // update the assistant message's text
    } else if (evt.type === 'tool-call') {
      // append to the assistant message's toolCalls
    } else if (evt.type === 'done') {
      done = true;
      // mark status 'done'
    }
  }
} finally {
  if (!done) {
    // mark status 'stopped'
  }
}
```
