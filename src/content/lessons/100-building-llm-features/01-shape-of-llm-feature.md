# The shape of an LLM feature in a React app

You've used `fetch` streams (lesson 29) and server functions (lesson 22). An LLM feature is
those two ideas combined under one extra constraint: the response arrives token by token, over
seconds, and a person is watching it render.

## The proxy rule

Never call a model provider from the browser with a real API key. The key would ship in your
bundle, readable by anyone who opens devtools. Every production LLM feature routes through a
server: a route handler, a server function (lesson 22), or an edge function (lesson 90). That
server holds the key, applies auth and rate limits, logs what it needs to, and — this is the
part teams skip — can swap providers or models without a client release.

This is the BFF (backend-for-frontend) pattern applied to AI: your frontend talks to *your*
endpoint, which talks to Anthropic, OpenAI, or whichever provider, using the Vercel AI SDK, the
Anthropic SDK, or the OpenAI SDK server-side. The frontend never sees the provider's API shape
directly — it sees whatever your BFF decides to stream back.

## The wire protocol: SSE over fetch

Server-sent events are the de facto format for streaming a chat response: a sequence of frames,
each a few lines of text ending in a blank line, like

```
event: content_block_delta
data: {"type":"text_delta","text":"Hel"}

data: {"type":"text_delta","text":"lo"}

```

The browser's built-in `EventSource` API only does SSE over `GET` with no custom headers or
body, which rules it out for anything that needs to send a prompt or an auth header. Chat UIs
instead `fetch` a `POST` endpoint and read `response.body` as a `ReadableStream<Uint8Array>`,
decoding and splitting it into frames by hand. The Anthropic Messages API streams events like
`message_start`, `content_block_start`, a run of `content_block_delta` (each a `text_delta` or,
for tool arguments, an `input_json_delta`), `content_block_stop`, and `message_stop` — the same
shape whether you parse it yourself or let a library do it. (Exact event and field names should
be checked against `docs.anthropic.com` before you ship against them; this is accurate as of
early/mid-2026 but providers do revise streaming formats.) The Vercel AI SDK's `streamText` and
`useChat` wrap this parsing for you and expose a UI message stream — reach for it in a real
project; write the parser yourself once, here, so you understand what it's hiding.

## Rendering a stream without wrecking React

A naive implementation calls `setState` on every delta. For a 200-token reply that's 200
renders in under a second — each one cheap alone, but enough of them to jank scrolling and
fight the browser's paint loop. Two things fix this:

- **Buffer, then flush.** Accumulate deltas in a ref and flush the buffer to state at most once
  per animation frame (or every ~16ms via `setTimeout`), not once per token. You already have
  the tool for showing partial progress without over-rendering: `useDeferredValue` on the buffer,
  or `startTransition` around the flush, so React can interrupt a big text update for the next
  keystroke or click. Avoid `flushSync` here — it defeats the batching you just built.
- **Render markdown incrementally.** Treat partial content as plain text until the stream is
  either done or has reached a stable boundary (end of a line, closed code fence); re-parsing
  broken markdown every token flickers.

## Abort, stop, retry

`AbortController` is the whole mechanism (lesson 29 covered it for plain fetch). A visible
"Stop" button calls `controller.abort()`; your stream-reading loop should treat that as an
expected exit, not an error — keep whatever text arrived so far and mark the message `stopped`
rather than `error`. "Retry" is just re-sending the last user turn, usually swapping the failed
or stopped assistant message rather than appending a new one.

## Optimistic messages and accessibility

Append the user's message to the transcript the instant they hit send, before the network call
resolves — there's nothing to wait for, they typed it. Add a placeholder assistant message with
a `streaming` status so the UI has something to attach the incoming text to.

Screen readers don't want a `aria-live="polite"` region announcing every token; that's
unusable noise. Update the live region on sentence or paragraph boundaries, and announce once
more when the whole response finishes. Respect `prefers-reduced-motion` — skip a typewriter
animation for users who've asked for less motion; render text as it arrives, not artificially
throttled for effect.

## Tool use and generative UI

The tool loop, at the wire level: the model emits a `tool_use` block (name + a JSON object of
arguments, itself streamed as an `input_json_delta` you accumulate) instead of, or alongside,
text. Your code runs the tool — client-side (open a modal, apply a filter) or server-side
(query a database) — and, for server-side tools in a multi-turn agent loop, sends a `tool_result`
back so the model can continue. This is generative UI: instead of only returning text, the model
picks a tool, and you map that tool call to a React component (`<WeatherCard>`,
`<ChartCard>`) rather than a text description. Any tool with a side effect — sending an email,
deleting something, charging a card — needs an explicit confirmation step in the UI before it
runs; never auto-execute a side-effectful tool call from model output alone (more in the next
concept, and OWASP's LLM Top 10 "excessive agency" item).

## Further reading (optional)

- Anthropic, Messages API streaming — https://docs.anthropic.com/en/docs/build-with-claude/streaming
- Anthropic, tool use — https://docs.anthropic.com/en/docs/agents-and-tools/tool-use
- Vercel AI SDK, `streamText` / `useChat` — https://ai-sdk.dev/docs
- MDN, Server-sent events — https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
