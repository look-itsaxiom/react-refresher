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

// TODO: read `response.body` as it arrives, decode it as UTF-8, split on newlines (buffering an
// incomplete trailing line across chunk boundaries), and call `onItem` for each complete line as
// soon as it's available — not after the whole response finishes. If `signal` is or becomes
// aborted, stop reading and reject with an error whose `name` is 'AbortError'.
export async function readNdjson<T = unknown>(response: Response, options: ReadNdjsonOptions<T>): Promise<void> {
  const text = await response.text();
  for (const line of text.split('\n')) {
    if (line.trim()) options.onItem(JSON.parse(line) as T);
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
