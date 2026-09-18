import { waitFor } from '@testing-library/dom';
import type { Check } from '../../../types';

type Item = { id: number; value: string };
type WorkerClient = { call: <T = unknown>(method: string, payload: unknown) => Promise<T>; terminate: () => void };
type Mod = {
  hashItems: (items: Item[]) => number;
  FakeWorker: new (handlers: Record<string, (payload: any) => unknown>, delayMs?: number) => unknown;
  createWorkerClient: (worker: unknown) => WorkerClient;
};

export const checks: Check[] = [
  {
    name: 'call() resolves with the handler result for a real round trip through FakeWorker',
    run: async ({ mod, expect }) => {
      const { FakeWorker, createWorkerClient, hashItems } = mod as unknown as Mod;
      const items: Item[] = [
        { id: 1, value: 'alpha' },
        { id: 2, value: 'beta' },
      ];
      const worker = new FakeWorker({ hashItems });
      const client = createWorkerClient(worker);
      const result = await client.call<number>('hashItems', items);
      expect(result).to.equal(hashItems(items));
    },
  },
  {
    name: 'two concurrent calls resolve independently, correlated by id rather than arrival order',
    run: async ({ mod, expect }) => {
      const { FakeWorker, createWorkerClient } = mod as unknown as Mod;
      const worker = new FakeWorker({
        slow: async (payload: string) => {
          await new Promise((resolve) => setTimeout(resolve, 60));
          return `slow:${payload}`;
        },
        fast: (payload: string) => `fast:${payload}`,
      });
      const client = createWorkerClient(worker);

      const slowPromise = client.call<string>('slow', 'a');
      const fastPromise = client.call<string>('fast', 'b');

      const fastResult = await fastPromise;
      expect(fastResult, 'the fast call should resolve without waiting for the slow one to finish').to.equal(
        'fast:b',
      );
      const slowResult = await slowPromise;
      expect(slowResult, 'the slow call should still resolve with its own result, not the fast one').to.equal(
        'slow:a',
      );
    },
  },
  {
    name: 'a handler error rejects the matching call only, leaving other in-flight calls unaffected',
    run: async ({ mod, expect }) => {
      const { FakeWorker, createWorkerClient } = mod as unknown as Mod;
      const worker = new FakeWorker({
        ok: (payload: string) => `ok:${payload}`,
        boom: () => {
          throw new Error('handler exploded');
        },
      });
      const client = createWorkerClient(worker);

      const okPromise = client.call<string>('ok', 'x');
      const boomPromise = client.call('boom', undefined);

      let caught: unknown;
      try {
        await boomPromise;
      } catch (err) {
        caught = err;
      }
      expect((caught as Error)?.message).to.equal('handler exploded');
      expect(await okPromise).to.equal('ok:x');
    },
  },
  {
    name: 'the UI shows a pending state while the call is in flight and clears it once it resolves',
    run: async (ctx) => {
      const { render, screen, user, Component, expect } = ctx;
      render(<Component />);
      const button = screen.getByRole('button', { name: /hash items/i });
      const root = button.parentElement as HTMLElement;

      expect(root.getAttribute('data-pending')).to.equal('false');
      await user.click(button);
      expect(
        root.getAttribute('data-pending'),
        'should flip to pending immediately after the click, before the worker responds',
      ).to.equal('true');

      await waitFor(() => expect(root.getAttribute('data-pending')).to.equal('false'));
      expect(screen.getByText(/^hash: -?\d+$/)).to.exist;
    },
  },
];
