import { useRef, useState } from 'react';

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

function parseFrame(raw: string): SSEFrame | null {
  let event: string | undefined;
  const dataLines: string[] = [];
  for (const line of raw.split('\n')) {
    if (line === '' || line.startsWith(':')) continue;
    const colonIndex = line.indexOf(':');
    const field = colonIndex === -1 ? line : line.slice(0, colonIndex);
    let value = colonIndex === -1 ? '' : line.slice(colonIndex + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'event') event = value;
    else if (field === 'data') dataLines.push(value);
  }
  if (event === undefined && dataLines.length === 0) return null;
  return { event, data: dataLines.join('\n') };
}

export async function* parseSSE(stream: ReadableStream<Uint8Array>): AsyncGenerator<SSEFrame> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (value) buffer += decoder.decode(value, { stream: true });
      if (done) buffer += decoder.decode();
      buffer = buffer.replace(/\r\n/g, '\n');

      let sepIndex = buffer.indexOf('\n\n');
      while (sepIndex !== -1) {
        const raw = buffer.slice(0, sepIndex);
        buffer = buffer.slice(sepIndex + 2);
        const frame = parseFrame(raw);
        if (frame) yield frame;
        sepIndex = buffer.indexOf('\n\n');
      }

      if (done) {
        if (buffer.trim()) {
          const frame = parseFrame(buffer);
          if (frame) yield frame;
        }
        break;
      }
    }
  } finally {
    reader.releaseLock();
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

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}${idCounter}`;
}

export function useChatStream(client: ChatClient) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [liveText, setLiveText] = useState('');
  const controllerRef = useRef<AbortController | null>(null);
  const lastUserTextRef = useRef('');

  async function run(text: string) {
    lastUserTextRef.current = text;
    const userId = nextId('u');
    const assistantId = nextId('a');

    setMessages((prev) => [
      ...prev,
      { id: userId, role: 'user', text },
      { id: assistantId, role: 'assistant', text: '', status: 'streaming', toolCalls: [] },
    ]);

    const controller = new AbortController();
    controllerRef.current = controller;
    const stream = client.send(text, controller.signal);

    let receivedDone = false;
    try {
      for await (const frame of parseSSE(stream)) {
        if (!frame.data) continue;
        const evt = JSON.parse(frame.data) as ChatEvent;

        if (evt.type === 'text-delta') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId && m.role === 'assistant' ? { ...m, text: m.text + evt.delta } : m,
            ),
          );
        } else if (evt.type === 'tool-call') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId && m.role === 'assistant'
                ? { ...m, toolCalls: [...m.toolCalls, { name: evt.name, args: evt.args }] }
                : m,
            ),
          );
        } else if (evt.type === 'done') {
          receivedDone = true;
          setMessages((prev) => {
            const next = prev.map((m) =>
              m.id === assistantId && m.role === 'assistant' ? { ...m, status: 'done' as const } : m,
            );
            const finished = next.find((m) => m.id === assistantId);
            if (finished && finished.role === 'assistant') setLiveText(finished.text);
            return next;
          });
        }
      }
    } finally {
      if (!receivedDone) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId && m.role === 'assistant' && m.status === 'streaming'
              ? { ...m, status: 'stopped' as const }
              : m,
          ),
        );
      }
    }
  }

  function send(text: string) {
    void run(text);
  }

  function stop() {
    controllerRef.current?.abort();
  }

  function retry() {
    if (lastUserTextRef.current) void run(lastUserTextRef.current);
  }

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
