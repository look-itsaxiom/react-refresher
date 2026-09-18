import { useState } from 'react';

export type Item = { id: number; text: string };

/**
 * Builds a Response whose body streams the given chunks one at a time, a few milliseconds
 * apart, so a consumer reading it incrementally can observe items arriving over time instead
 * of all at once. Don't change this — it stands in for a real streaming endpoint.
 */
export function makeStreamResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  let i = 0;
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (i >= chunks.length) {
        controller.close();
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
      controller.enqueue(encoder.encode(chunks[i]));
      i += 1;
    },
  });
  return new Response(stream);
}

export type ReadNdjsonOptions<T> = {
  signal?: AbortSignal;
  onItem: (item: T) => void;
};

function abortError(): DOMException {
  return new DOMException('Aborted', 'AbortError');
}

export async function readNdjson<T = unknown>(response: Response, options: ReadNdjsonOptions<T>): Promise<void> {
  const { signal, onItem } = options;
  if (signal?.aborted) throw abortError();
  if (!response.body) return;

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) throw abortError();

      const { done, value } = await reader.read();
      if (done) break;
      buffer += value;

      let newlineIndex = buffer.indexOf('\n');
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        if (line.trim()) onItem(JSON.parse(line) as T);
        if (signal?.aborted) throw abortError();
        newlineIndex = buffer.indexOf('\n');
      }
    }

    if (buffer.trim()) onItem(JSON.parse(buffer) as T);
  } finally {
    void reader.cancel().catch(() => {});
  }
}

export default function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState('idle');

  function start() {
    setItems([]);
    setStatus('streaming…');
    const response = makeStreamResponse([
      '{"id":1,"text":"first"}\n{"id":2,"tex',
      't":"second"}\n{"id":3,"text":"third"}\n',
    ]);
    readNdjson<Item>(response, {
      onItem: (item) => setItems((prev) => [...prev, item]),
    })
      .then(() => setStatus('done'))
      .catch((err) => setStatus(`failed: ${(err as Error).message}`));
  }

  return (
    <div style={{ padding: 16 }}>
      <button onClick={start}>Start stream</button>
      <p>{status}</p>
      <ul>
        {items.map((item) => (
          <li key={item.id}>{item.text}</li>
        ))}
      </ul>
    </div>
  );
}
