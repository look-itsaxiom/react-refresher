import { useState } from 'react';

export type SSEFrame = { event?: string; data: string };

export type ChatEvent =
  | { type: 'text-delta'; delta: string }
  | { type: 'tool-call'; name: string; args: Record<string, unknown> }
  | { type: 'done' };

export type ToolCall = { name: string; args: Record<string, unknown> };

export type Message =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; text: string; status: 'streaming' | 'done' | 'stopped'; toolCalls: ToolCall[] };

export type ChatClient = { send: (text: string, signal?: AbortSignal) => ReadableStream<Uint8Array> };

/**
 * Streams the given raw chunks (unmodified) one at a time, a few milliseconds apart. Used to
 * build fixtures for both parseSSE and the chat client below. Don't change this.
 */
export function makeStreamFromChunks(chunks: string[], delayMs = 5): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (i >= chunks.length) {
        controller.close();
        return;
      }
      if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
      controller.enqueue(encoder.encode(chunks[i]));
      i += 1;
    },
  });
}

/**
 * A fake ChatClient: `send()` streams the given SSE frame strings back one per chunk, and stops
 * emitting (closing the stream) once `signal` is aborted. Stands in for a real server proxy.
 * Don't change this.
 */
export function makeSSEClient(frames: string[], opts: { delayMs?: number } = {}): ChatClient {
  const delayMs = opts.delayMs ?? 5;
  return {
    send(_text: string, signal?: AbortSignal): ReadableStream<Uint8Array> {
      const encoder = new TextEncoder();
      let i = 0;
      return new ReadableStream<Uint8Array>({
        async pull(controller) {
          if (signal?.aborted || i >= frames.length) {
            controller.close();
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          if (signal?.aborted) {
            controller.close();
            return;
          }
          controller.enqueue(encoder.encode(frames[i]));
          i += 1;
        },
      });
    },
  };
}

function sseFrame(data: unknown, event?: string): string {
  return (event ? `event: ${event}\n` : '') + `data: ${JSON.stringify(data)}\n\n`;
}

const demoFrames = [
  ...'Hello there!'.split('').map((delta) => sseFrame({ type: 'text-delta', delta })),
  sseFrame({ type: 'done' }),
];

// TODO: read `stream` and yield one { event?, data } object per SSE frame, as frames complete —
// handling frames split across chunks, multi-line `data:` fields, `:` comment lines, CRLF line
// endings, and a final frame that isn't followed by a trailing blank line.
export async function* parseSSE(stream: ReadableStream<Uint8Array>): AsyncGenerator<SSEFrame> {
  const text = await new Response(stream).text();
  for (const raw of text.split('\n\n')) {
    if (!raw.trim()) continue;
    const line = raw.startsWith('data: ') ? raw.slice(6) : raw;
    yield { data: line };
  }
}

export function ToolCallCard({ call }: { call: ToolCall }) {
  return (
    <div data-testid="tool-call-card">
      <strong>{call.name}</strong>
      <code>{JSON.stringify(call.args)}</code>
    </div>
  );
}

// TODO: implement send/stop/retry against `client`, driving `messages` from parseSSE + ChatEvent.
export function useChatStream(client: ChatClient) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [liveText, setLiveText] = useState('');

  function send(_text: string) {
    // TODO
  }

  function stop() {
    // TODO
  }

  function retry() {
    // TODO
  }

  void client;
  return { messages, liveText, send, stop, retry };
}

export function Chat({ client }: { client: ChatClient }) {
  const { messages, liveText, send, stop, retry } = useChatStream(client);
  const [draft, setDraft] = useState('');

  return (
    <div>
      <ul>
        {messages.map((m) => (
          <li key={m.id} data-role={m.role} data-status={m.role === 'assistant' ? m.status : undefined}>
            {m.role === 'user' ? (
              m.text
            ) : (
              <>
                <span>{m.text}</span>
                {m.toolCalls.map((call, i) => (
                  <ToolCallCard key={i} call={call} />
                ))}
              </>
            )}
          </li>
        ))}
      </ul>
      <div aria-live="polite">{liveText}</div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) {
            send(draft);
            setDraft('');
          }
        }}
      >
        <input aria-label="Message" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <button type="submit">Send</button>
      </form>
      <button type="button" onClick={stop}>
        Stop
      </button>
      <button type="button" onClick={retry}>
        Retry
      </button>
    </div>
  );
}

export default function App() {
  return <Chat client={makeSSEClient(demoFrames)} />;
}
