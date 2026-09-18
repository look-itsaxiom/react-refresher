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

export function createWorkerClient(worker: FakeWorker): WorkerClient {
  let nextId = 0;
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (reason: unknown) => void }>();

  const onMessage = (event: MessageEvent<WorkerResponse>) => {
    const response = event.data;
    const entry = pending.get(response.id);
    if (!entry) return;
    pending.delete(response.id);
    if (response.ok) entry.resolve(response.result);
    else entry.reject(new Error(response.error));
  };
  worker.addEventListener('message', onMessage);

  return {
    call<T>(method: string, payload: unknown) {
      const id = nextId++;
      return new Promise<T>((resolve, reject) => {
        pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
        worker.postMessage({ id, method, payload });
      });
    },
    terminate() {
      worker.removeEventListener('message', onMessage);
      worker.terminate();
      pending.clear();
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
