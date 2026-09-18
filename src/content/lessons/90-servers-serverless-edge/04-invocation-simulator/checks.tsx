import type { Check } from '../../../types';

type Invocation = { t: number; durationMs: number };
type Model = {
  kind: 'server' | 'function' | 'isolate';
  coldStartMs: number;
  idleTimeoutMs: number;
  maxConcurrencyPerInstance: number;
};
type SimResult = {
  coldStarts: number;
  p50Ms: number;
  p95Ms: number;
  instanceSeconds: number;
  requestCount: number;
};
type Pricing = { perRequest: number; perGbSecond: number; memoryGb: number };

type Mod = {
  simulateInvocations: (requests: Invocation[], model: Model) => SimResult;
  estimateCost: (sim: SimResult, pricing: Pricing) => number;
};

const THREE_AT_ONCE: Invocation[] = [
  { t: 0, durationMs: 100 },
  { t: 0, durationMs: 100 },
  { t: 0, durationMs: 100 },
];

export const checks: Check[] = [
  {
    name: 'concurrency 1 forces a cold start per simultaneous request; concurrency 10 shares one instance',
    run: async ({ mod, expect }) => {
      const { simulateInvocations } = mod as unknown as Mod;
      const narrow = simulateInvocations(THREE_AT_ONCE, {
        kind: 'function',
        coldStartMs: 50,
        idleTimeoutMs: 1000,
        maxConcurrencyPerInstance: 1,
      });
      expect(narrow.coldStarts).to.equal(3);
      expect(narrow.p50Ms).to.equal(150);
      expect(narrow.instanceSeconds).to.be.closeTo(0.45, 1e-9);

      const wide = simulateInvocations(THREE_AT_ONCE, {
        kind: 'function',
        coldStartMs: 50,
        idleTimeoutMs: 1000,
        maxConcurrencyPerInstance: 10,
      });
      expect(wide.coldStarts).to.equal(1);
      expect(wide.p50Ms).to.equal(100);
      expect(wide.p95Ms).to.equal(150);
      expect(wide.instanceSeconds).to.be.closeTo(0.35, 1e-9);
    },
  },
  {
    name: 'a request arriving after idleTimeoutMs retires the instance and pays a second cold start',
    run: async ({ mod, expect }) => {
      const { simulateInvocations } = mod as unknown as Mod;
      const result = simulateInvocations(
        [
          { t: 0, durationMs: 100 },
          { t: 2000, durationMs: 100 },
        ],
        { kind: 'function', coldStartMs: 200, idleTimeoutMs: 1000, maxConcurrencyPerInstance: 5 },
      );
      expect(result.coldStarts).to.equal(2);
      expect(result.p50Ms).to.equal(300);
      expect(result.instanceSeconds).to.be.closeTo(0.6, 1e-9);
    },
  },
  {
    name: 'a request arriving before idleTimeoutMs reuses the instance with no second cold start',
    run: async ({ mod, expect }) => {
      const { simulateInvocations } = mod as unknown as Mod;
      const result = simulateInvocations(
        [
          { t: 0, durationMs: 100 },
          { t: 500, durationMs: 100 },
        ],
        { kind: 'isolate', coldStartMs: 200, idleTimeoutMs: 1000, maxConcurrencyPerInstance: 1 },
      );
      expect(result.coldStarts).to.equal(1);
      expect(result.p50Ms).to.equal(100);
      expect(result.p95Ms).to.equal(300);
      expect(result.instanceSeconds).to.be.closeTo(0.4, 1e-9);
    },
  },
  {
    name: 'the server model never cold-starts and bills wall-clock uptime, not summed execution time',
    run: async ({ mod, expect }) => {
      const { simulateInvocations } = mod as unknown as Mod;
      const result = simulateInvocations(
        [
          { t: 0, durationMs: 100 },
          { t: 50, durationMs: 200 },
          { t: 1000, durationMs: 50 },
        ],
        { kind: 'server', coldStartMs: 999999, idleTimeoutMs: 0, maxConcurrencyPerInstance: 1 },
      );
      expect(result.coldStarts).to.equal(0);
      expect(result.p50Ms).to.equal(100);
      expect(result.p95Ms).to.equal(200);
      expect(result.instanceSeconds).to.be.closeTo(1.05, 1e-9);
      expect(result.requestCount).to.equal(3);
    },
  },
  {
    name: 'requests out of t-order are handled as if sorted first',
    run: async ({ mod, expect }) => {
      const { simulateInvocations } = mod as unknown as Mod;
      const outOfOrder = simulateInvocations(
        [
          { t: 500, durationMs: 100 },
          { t: 0, durationMs: 100 },
        ],
        { kind: 'isolate', coldStartMs: 200, idleTimeoutMs: 1000, maxConcurrencyPerInstance: 1 },
      );
      expect(outOfOrder.coldStarts).to.equal(1);
      expect(outOfOrder.instanceSeconds).to.be.closeTo(0.4, 1e-9);
    },
  },
  {
    name: 'estimateCost combines per-request and GB-second pricing',
    run: async ({ mod, expect }) => {
      const { simulateInvocations, estimateCost } = mod as unknown as Mod;
      const sim = simulateInvocations(THREE_AT_ONCE, {
        kind: 'function',
        coldStartMs: 50,
        idleTimeoutMs: 1000,
        maxConcurrencyPerInstance: 1,
      });
      const cost = estimateCost(sim, { perRequest: 0.01, perGbSecond: 0.1, memoryGb: 2 });
      expect(cost).to.be.closeTo(0.12, 1e-9);
    },
  },
];
