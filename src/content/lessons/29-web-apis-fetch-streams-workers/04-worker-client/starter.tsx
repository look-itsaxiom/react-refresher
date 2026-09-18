import { useState } from 'react';

export type Item = { id: number; value: string };

/** Stands in for CPU-heavy work — in real life this would be big enough to freeze the UI. */
export function hashItems(items: Item[]): number {
  let hash = 0;
  for (const item of items) {
    for (const ch of item.value) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  }
  return hash;
}

export type WorkerRequest = { id: number; method: string; payload: unknown };
export type WorkerResponse = { id: number; ok: true; result: unknown } | { id: number; ok: false; error: string };

/**
 * Stands in for a real Worker: runs `handlers` on the other side of a real MessageChannel (so
 * payloads are structured-cloned across the boundary, not just passed by reference), after an
 * artificial delay to simulate real worker latency. Don't change this.
 */
export class FakeWorker {
  private channel = new MessageChannel();
  private listeners = new Set<(event: MessageEvent<WorkerResponse>) => void>();

  constructor(handlers: Record<string, (payload: any) => unknown>, delayMs = 20) {
    this.channel.port1.onmessage = async (event: MessageEvent<WorkerRequest>) => {
      const { id, method, payload } = event.data;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      try {
        const handler = handlers[method];
        if (!handler) throw new Error(`Unknown method: ${method}`);
        const result = await handler(payload);
        this.channel.port1.postMessage({ id, ok: true, result } satisfies WorkerResponse);
      } catch (err) {
        this.channel.port1.postMessage({ id, ok: false, error: (err as Error).message } satisfies WorkerResponse);
      }
    };
    this.channel.port2.onmessage = (event: MessageEvent<WorkerResponse>) => {
      for (const listener of this.listeners) listener(event);
    };
  }

  postMessage(data: WorkerRequest): void {
    this.channel.port2.postMessage(data);
  }

  addEventListener(_type: 'message', listener: (event: MessageEvent<WorkerResponse>) => void): void {
    this.listeners.add(listener);
  }

  removeEventListener(_type: 'message', listener: (event: MessageEvent<WorkerResponse>) => void): void {
    this.listeners.delete(listener);
  }

  terminate(): void {
    this.listeners.clear();
  }
}

export type WorkerClient = {
  call<T = unknown>(method: string, payload: unknown): Promise<T>;
  terminate(): void;
};

// TODO: wrap `worker` in a request/response protocol. Each call() should post a message with a
// fresh id and resolve/reject the matching promise when a response with that id comes back.
// Two concurrent calls must resolve independently, correlated by id, regardless of arrival order.
export function createWorkerClient(worker: FakeWorker): WorkerClient {
  return {
    call(method, payload) {
      worker.postMessage({ id: 0, method, payload });
      return new Promise((resolve) => {
        worker.addEventListener('message', (event) => {
          if (event.data.ok) resolve(event.data.result as any);
        });
      });
    },
    terminate() {
      worker.terminate();
    },
  };
}

export default function App() {
  const [items] = useState<Item[]>([
    { id: 1, value: 'alpha' },
    { id: 2, value: 'beta' },
  ]);
  const [hash, setHash] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [worker] = useState(() => new FakeWorker({ hashItems }));
  const [client] = useState(() => createWorkerClient(worker));

  async function run() {
    setPending(true);
    const result = await client.call<number>('hashItems', items);
    setHash(result);
    setPending(false);
  }

  return (
    <div style={{ padding: 16 }} data-pending={pending}>
      <button onClick={run}>Hash items</button>
      <p>{hash === null ? 'idle' : `hash: ${hash}`}</p>
    </div>
  );
}
