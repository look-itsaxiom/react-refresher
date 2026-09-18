# Parse an SSE stream and drive a chat UI from it

`makeSSEClient` and `makeStreamFromChunks` below are provided — don't change them. They stand
in for a real backend: `makeSSEClient(frames)` returns a `ChatClient` whose `send()` streams
server-sent-event frames like `data: {"type":"text-delta","delta":"Hel"}\n\n` back over time,
the same shape a real proxy to Anthropic or OpenAI would produce after your server normalizes
provider events into this app's own event type.

## Part 1 — `parseSSE`

Implement:

```ts
function parseSSE(stream: ReadableStream<Uint8Array>): AsyncGenerator<{ event?: string; data: string }>
```

It must:

- Decode UTF-8 as bytes arrive (a multi-byte character can be split across chunks).
- Treat a blank line as the end of a frame — frames can arrive split across several stream
  chunks, or several frames can arrive in one chunk.
- Join multiple `data:` lines within one frame with `\n` (a multi-line SSE payload).
- Ignore lines starting with `:` (comments).
- Handle `\r\n` line endings the same as `\n`.
- Yield a final frame even if the stream ends without a trailing blank line.

## Part 2 — `useChatStream` and `<Chat>`

Implement a `useChatStream(client: ChatClient)` hook and a `<Chat client={client} />` component
built on it. Chat events, once you `JSON.parse` a frame's `data`, are one of:

```ts
type ChatEvent =
  | { type: 'text-delta'; delta: string }
  | { type: 'tool-call'; name: string; args: Record<string, unknown> }
  | { type: 'done' };
```

Behavior:

- `send(text)` appends a user message to the transcript immediately, then adds an assistant
  message with `status: 'streaming'` and starts consuming the stream.
- `text-delta` events append to the assistant message's text as they arrive.
- `tool-call` events attach a tool call to the assistant message; render it with the provided
  `<ToolCallCard call={...} />` inside the message.
- A `done` event sets that message's `status` to `'done'`.
- The transcript renders each message as a list item with `data-role="user" | "assistant"` and,
  for assistant messages, `data-status="streaming" | "done" | "stopped"`.
- A **Stop** button calls `stop()`, which aborts the in-flight stream via `AbortController`;
  the assistant message keeps whatever partial text it had and its status becomes `'stopped'`.
- A **Retry** button calls `retry()`, which re-sends the last user message.
- An `aria-live="polite"` region shows the completed assistant text once a message reaches
  `'done'`.
- A form with a text input (label it, e.g. `aria-label="Message"`) and a **Send** button calls
  `send()` with the input's value and clears the input.

The default export renders `<Chat client={makeSSEClient(demoFrames)} />` so the preview shows
something streaming in.
