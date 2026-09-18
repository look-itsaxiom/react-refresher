import type { Check } from '../../../types';
import type { ComponentType } from 'react';

type EventStream<T> = {
  push(value: T): void;
  close(): void;
  readonly consumers: number;
  [Symbol.asyncIterator](): AsyncIterator<T>;
};
type Mod = {
  createEventStream: <T>() => EventStream<T>;
  Feed: ComponentType<{ stream: EventStream<string> }>;
};

const raceTimeout = (ms: number, message: string) =>
  new Promise<never>((_, reject) => setTimeout(() => reject(new Error(message)), ms));

export const checks: Check[] = [
  {
    name: 'delivers pushed values in order, whether they were pushed before or after consumption starts',
    run: async ({ mod, expect }) => {
      const { createEventStream } = mod as unknown as Mod;
      const stream = createEventStream<string>();
      stream.push('a');
      stream.push('b');
      const it = stream[Symbol.asyncIterator]();
      const r1 = await it.next();
      stream.push('c'); // pushed after consumption already started
      const r2 = await it.next();
      const r3 = await it.next();
      expect([r1.value, r2.value, r3.value]).to.deep.equal(['a', 'b', 'c']);
      expect([r1.done, r2.done, r3.done]).to.deep.equal([false, false, false]);
    },
  },
  {
    name: 'close() ends iteration with done: true instead of hanging',
    run: async ({ mod, expect }) => {
      const { createEventStream } = mod as unknown as Mod;
      const stream = createEventStream<number>();
      stream.push(1);
      const it = stream[Symbol.asyncIterator]();
      await it.next();
      stream.close();
      const result = await Promise.race([it.next(), raceTimeout(400, 'next() never resolved after close()')]);
      expect(result.done).to.equal(true);
    },
  },
  {
    name: 'close() while a consumer is already waiting resolves that pending call promptly, not on a delay',
    run: async ({ mod, expect }) => {
      const { createEventStream } = mod as unknown as Mod;
      const stream = createEventStream<number>();
      const it = stream[Symbol.asyncIterator]();
      const started = Date.now();
      const pending = it.next();
      stream.close();
      const result = await Promise.race([pending, raceTimeout(120, 'pending next() did not resolve promptly on close()')]);
      expect(result.done).to.equal(true);
      expect(Date.now() - started).to.be.lessThan(120);
    },
  },
  {
    name: '`consumers` increments when a consumer subscribes and decrements when `.return()` is called',
    run: async ({ mod, expect }) => {
      const { createEventStream } = mod as unknown as Mod;
      const stream = createEventStream<number>();
      expect(stream.consumers).to.equal(0);
      const it = stream[Symbol.asyncIterator]();
      expect(stream.consumers, 'subscribing should register a consumer immediately').to.equal(1);
      await it.return?.();
      expect(stream.consumers, 'returning should unregister the consumer').to.equal(0);
    },
  },
  {
    name: 'a mounted Feed renders pushed values and unregisters its consumer on unmount, without leaking',
    run: async ({ mod, expect, render, act, screen }) => {
      const { createEventStream, Feed } = mod as unknown as Mod;
      const stream = createEventStream<string>();
      let utils!: ReturnType<typeof render>;
      await act(async () => {
        utils = render(<Feed stream={stream} />);
      });
      await act(async () => {
        stream.push('first');
      });
      const item = await screen.findByText('first');
      expect(item).to.exist;
      expect(stream.consumers, 'mounted Feed should be a registered consumer').to.equal(1);
      await act(async () => {
        utils.unmount();
      });
      expect(stream.consumers, 'unmounting should clean up the subscription').to.equal(0);
    },
  },
];
