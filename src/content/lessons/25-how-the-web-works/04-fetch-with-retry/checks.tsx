import type { Check } from '../../../types';

type User = { id: number; name: string; bio: string };
type Mod = {
  ClientError: new (message: string) => Error;
  attempts: { count: number };
  request: (id: number) => Promise<User>;
  fetchWithRetry: <T>(
    fn: () => Promise<T>,
    options: { retries: number; baseDelayMs: number; maxDelayMs?: number; signal?: AbortSignal },
  ) => Promise<T>;
};

export const checks: Check[] = [
  {
    name: 'recovers from one transient failure by retrying, and returns the eventual success',
    run: async ({ mod, expect, server }) => {
      server.failNext('temporary blip');
      const { fetchWithRetry, request, attempts } = mod as unknown as Mod;
      const user = await fetchWithRetry(() => request(1), { retries: 2, baseDelayMs: 5, maxDelayMs: 20 });
      expect(user.name).to.equal('Ada Lovelace');
      expect(attempts.count, 'should have tried twice: one failure, one success').to.equal(2);
    },
  },
  {
    name: 'a ClientError is never retried and rejects immediately with the original error',
    run: async ({ mod, expect }) => {
      const { fetchWithRetry, request, attempts, ClientError } = mod as unknown as Mod;
      let caught: unknown;
      try {
        await fetchWithRetry(() => request(-1), { retries: 3, baseDelayMs: 5 });
      } catch (err) {
        caught = err;
      }
      expect(caught, 'should have rejected').to.be.instanceOf(ClientError);
      expect(attempts.count, 'should never retry a client error').to.equal(1);
    },
  },
  {
    name: 'gives up once the retry budget is exhausted, rejecting with the last error',
    run: async ({ mod, expect, server }) => {
      server.failNext('server exploded');
      const { fetchWithRetry, request, attempts } = mod as unknown as Mod;
      let caught: unknown;
      try {
        await fetchWithRetry(() => request(1), { retries: 0, baseDelayMs: 5 });
      } catch (err) {
        caught = err;
      }
      expect((caught as Error)?.message).to.equal('server exploded');
      expect(attempts.count, 'retries: 0 means exactly one attempt').to.equal(1);
    },
  },
  {
    name: 'an already-aborted signal rejects immediately with an AbortError, without waiting',
    run: async ({ mod, expect }) => {
      const { fetchWithRetry } = mod as unknown as Mod;
      const controller = new AbortController();
      controller.abort();
      const started = Date.now();
      // Race against a manual timeout so a solution that ignores `signal` and actually calls
      // `fn` fails this check quickly instead of hanging until the outer test timeout.
      const guarded = Promise.race([
        fetchWithRetry(
          () => new Promise<never>((_, reject) => setTimeout(() => reject(new Error('fn should not run')), 300)),
          { retries: 3, baseDelayMs: 1000, signal: controller.signal },
        ),
        new Promise((_, reject) => setTimeout(() => reject(new Error('did not reject promptly')), 300)),
      ]);
      let caught: unknown;
      try {
        await guarded;
      } catch (err) {
        caught = err;
      }
      expect((caught as Error)?.name).to.equal('AbortError');
      expect(Date.now() - started, 'should reject immediately, not after any delay').to.be.lessThan(200);
    },
  },
  {
    name: 'aborting mid-wait cuts the backoff short instead of waiting it out',
    run: async ({ mod, expect }) => {
      const { fetchWithRetry } = mod as unknown as Mod;
      const controller = new AbortController();
      let caught: unknown;
      const started = Date.now();
      const promise = fetchWithRetry(() => Promise.reject(new Error('transient')), {
        retries: 5,
        baseDelayMs: 1000,
        signal: controller.signal,
      }).catch((err) => {
        caught = err;
      });
      setTimeout(() => controller.abort(), 15);
      await promise;
      expect((caught as Error)?.name).to.equal('AbortError');
      expect(Date.now() - started, 'should not wait out the full 1000ms backoff').to.be.lessThan(500);
    },
  },
  {
    name: 'maxDelayMs caps the backoff so recovery stays fast even with a large baseDelayMs',
    run: async ({ mod, expect, server }) => {
      server.failNext('temporary blip');
      const { fetchWithRetry, request } = mod as unknown as Mod;
      const started = Date.now();
      const user = await fetchWithRetry(() => request(1), { retries: 1, baseDelayMs: 2000, maxDelayMs: 15 });
      expect(user.name).to.equal('Ada Lovelace');
      expect(Date.now() - started, 'maxDelayMs should have capped the single retry wait').to.be.lessThan(500);
    },
  },
];
