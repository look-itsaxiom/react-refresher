import type { Check } from '../../../types';

type ConcurrencyOptions = { limit: number; signal?: AbortSignal; settle?: boolean };
type Mod = {
  mapWithConcurrency: <T, R>(items: T[], fn: (item: T, index: number) => Promise<R>, options: ConcurrencyOptions) => Promise<R[]>;
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const checks: Check[] = [
  {
    name: 'never runs more than `limit` calls to `fn` at once, and results land in input order',
    run: async ({ mod, expect }) => {
      const { mapWithConcurrency } = mod as unknown as Mod;
      let current = 0;
      let max = 0;
      const fn = async (item: number) => {
        current++;
        max = Math.max(max, current);
        await wait(15);
        current--;
        return item * 2;
      };
      const results = await mapWithConcurrency([1, 2, 3, 4, 5, 6, 7, 8], fn, { limit: 3 });
      expect(results).to.deep.equal([2, 4, 6, 8, 10, 12, 14, 16]);
      expect(max, 'should reach the concurrency limit, not run sequentially').to.equal(3);
    },
  },
  {
    name: 'output order matches input order even when items finish in a different order',
    run: async ({ mod, expect }) => {
      const { mapWithConcurrency } = mod as unknown as Mod;
      const finishOrder: number[] = [];
      const fn = async (item: number, index: number) => {
        // Index 0 takes the longest, so it's the last to actually finish.
        await wait((4 - index) * 15);
        finishOrder.push(index);
        return item;
      };
      const results = await mapWithConcurrency([10, 20, 30, 40], fn, { limit: 4 });
      expect(results).to.deep.equal([10, 20, 30, 40]);
      expect(finishOrder[finishOrder.length - 1], 'index 0 should finish last').to.equal(0);
    },
  },
  {
    name: 'without settle, rejects as soon as the first failure arrives instead of waiting on slower in-flight work',
    run: async ({ mod, expect }) => {
      const { mapWithConcurrency } = mod as unknown as Mod;
      const fn = async (item: number, index: number) => {
        if (index === 1) {
          await wait(5);
          throw new Error('boom');
        }
        await wait(300);
        return item;
      };
      const started = Date.now();
      let caught: unknown;
      try {
        await mapWithConcurrency([1, 2, 3], fn, { limit: 3 });
      } catch (err) {
        caught = err;
      }
      expect((caught as Error)?.message).to.equal('boom');
      expect(Date.now() - started, 'should not wait for the slower items').to.be.lessThan(150);
    },
  },
  {
    name: 'settle: true runs every item to completion and rejects with an AggregateError of every failure',
    run: async ({ mod, expect }) => {
      const { mapWithConcurrency } = mod as unknown as Mod;
      const finished: number[] = [];
      const fn = async (item: number, index: number) => {
        await wait(10);
        finished.push(index);
        if (index === 1 || index === 3) throw new Error(`item ${index} failed`);
        return item;
      };
      let caught: unknown;
      try {
        await mapWithConcurrency([1, 2, 3, 4], fn, { limit: 4, settle: true });
      } catch (err) {
        caught = err;
      }
      expect(caught).to.be.instanceOf(AggregateError);
      expect((caught as AggregateError).errors).to.have.length(2);
      expect(finished, 'every item should still run, even after two failures').to.have.length(4);
    },
  },
  {
    name: 'an already-aborted signal rejects immediately with an AbortError and never calls fn',
    run: async ({ mod, expect }) => {
      const { mapWithConcurrency } = mod as unknown as Mod;
      const controller = new AbortController();
      controller.abort();
      let called = false;
      const fn = async (item: number) => {
        called = true;
        return item;
      };
      const started = Date.now();
      let caught: unknown;
      try {
        await mapWithConcurrency([1, 2, 3], fn, { limit: 2, signal: controller.signal });
      } catch (err) {
        caught = err;
      }
      expect((caught as Error)?.name).to.equal('AbortError');
      expect(called, 'fn should never be called once already aborted').to.equal(false);
      expect(Date.now() - started).to.be.lessThan(50);
    },
  },
  {
    name: 'aborting mid-run rejects quickly without waiting out the in-flight calls',
    run: async ({ mod, expect }) => {
      const { mapWithConcurrency } = mod as unknown as Mod;
      const controller = new AbortController();
      const fn = async (item: number) => {
        await wait(300);
        return item;
      };
      const started = Date.now();
      const promise = mapWithConcurrency([1, 2, 3, 4, 5], fn, { limit: 2, signal: controller.signal });
      setTimeout(() => controller.abort(), 15);
      let caught: unknown;
      try {
        await promise;
      } catch (err) {
        caught = err;
      }
      expect((caught as Error)?.name).to.equal('AbortError');
      expect(Date.now() - started, 'should not wait for the 300ms in-flight calls').to.be.lessThan(150);
    },
  },
];
