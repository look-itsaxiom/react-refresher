Don't reach for `response.text()` or `response.json()` — those drain the whole stream before
resolving, which is exactly the "wait for everything, then process it" behavior you're replacing.
Get the reader from `response.body` (or `response.body.pipeThrough(new TextDecoderStream())` to
get decoded strings instead of raw bytes) and call `reader.read()` in a loop.

---

`TextDecoderStream` handles the byte-level chunk boundary (a multi-byte UTF-8 character split
across two reads) for you. It does **not** handle your line-level boundary — a chunk can still end
mid-line. Keep your own `buffer` string: append each decoded chunk to it, then repeatedly look for
`'\n'` in `buffer` and peel off complete lines, leaving whatever's left (the incomplete tail) in
`buffer` for next time.

---

Structure:

```ts
const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader();
let buffer = '';
while (true) {
  if (signal?.aborted) throw abortError();
  const { done, value } = await reader.read();
  if (done) break;
  buffer += value;
  let newlineIndex = buffer.indexOf('\n');
  while (newlineIndex !== -1) {
    const line = buffer.slice(0, newlineIndex);
    buffer = buffer.slice(newlineIndex + 1);
    if (line.trim()) onItem(JSON.parse(line));
    newlineIndex = buffer.indexOf('\n');
  }
}
```

Check `signal?.aborted` in two places: before each `reader.read()` (so you don't start reading a
chunk you don't need), and — for the mid-stream-abort check to pass — again right after calling
`onItem`, in case the abort happens synchronously inside that callback.

---

For the `AbortError`, use `new DOMException('Aborted', 'AbortError')` — that's what a real aborted
`fetch` rejects with, and it's what gives the rejected error a `.name` of `'AbortError'` for your
`catch` block (or the checks) to test against.

---

Cancel the reader in a `finally` block (`reader.cancel().catch(() => {})`) so an abort or an error
actually releases the underlying stream instead of leaving it half-read.
