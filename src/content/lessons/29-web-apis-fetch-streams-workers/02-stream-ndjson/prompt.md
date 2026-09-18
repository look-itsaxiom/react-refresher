`makeStreamResponse(chunks)` below builds a `Response` whose body streams the given strings one at
a time, a few milliseconds apart — a stand-in for a real NDJSON endpoint (one JSON object per
line) trickling data in over the network, the same shape an LLM streaming API or a live feed uses.

Implement:

```ts
type ReadNdjsonOptions<T> = {
  signal?: AbortSignal;
  onItem: (item: T) => void;
};

function readNdjson<T = unknown>(response: Response, options: ReadNdjsonOptions<T>): Promise<void>
```

`readNdjson` reads `response.body` as it arrives and calls `options.onItem` for each complete JSON
line **as soon as that line is available** — not after the whole response finishes. Requirements:

1. **Decode and split correctly.** `response.body` is a stream of raw bytes; decode it as UTF-8
   and split on `\n`. A chunk boundary can land in the middle of a line (or even mid multi-byte
   character) — buffer whatever's incomplete and combine it with the next chunk instead of
   dropping or mis-parsing it.
2. **Emit incrementally.** Call `onItem` the moment a line is complete, not after `response.body`
   finishes. This is the entire point of streaming instead of `response.json()`.
3. **Abort support.** If `options.signal` is already aborted, reject immediately with an error
   whose `name` is `'AbortError'`, without reading anything. If it becomes aborted mid-stream,
   stop reading — don't call `onItem` for any line after the point of abort — and reject the same
   way.
4. **Resolve once the stream ends** (assuming it wasn't aborted), after every complete line has
   been delivered to `onItem`.

Don't change `makeStreamResponse` — the checks (and `App.tsx`) use it directly. `App.tsx` renders
a button that starts a stream and appends each item to a list as it arrives, so you can watch
items show up one at a time instead of all appearing at once.
