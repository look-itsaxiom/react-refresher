import type { Check } from '../../../types';

type MockResult = { type: 'return' | 'throw'; value: unknown };
type Mock = ((...args: unknown[]) => unknown) & {
  mock: { calls: unknown[][]; results: MockResult[] };
  mockReturnValue: (v: unknown) => Mock;
  mockResolvedValue: (v: unknown) => Mock;
  mockImplementationOnce: (impl: (...args: unknown[]) => unknown) => Mock;
};
type FakeClock = {
  setTimeout: (cb: () => void, ms: number) => number;
  setInterval: (cb: () => void, ms: number) => number;
  clearTimeout: (id: number) => void;
  clearInterval: (id: number) => void;
  advanceBy: (ms: number) => void;
  runAll: () => void;
};
type Mod = { fn: (impl?: (...args: unknown[]) => unknown) => Mock; createFakeClock: () => FakeClock };

export const checks: Check[] = [
  {
    name: 'fn() records call arguments and return values, and calls through to the given implementation',
    run: async ({ mod, expect }) => {
      const { fn } = mod as unknown as Mod;
      const double = fn((x: unknown) => (x as number) * 2);
      const a = double(3);
      const b = double(10);
      expect(a).to.equal(6);
      expect(b).to.equal(20);
      expect(double.mock.calls).to.deep.equal([[3], [10]]);
      expect(double.mock.results).to.deep.equal([
        { type: 'return', value: 6 },
        { type: 'return', value: 20 },
      ]);
    },
  },
  {
    name: 'mockReturnValue overrides every future call; mockImplementationOnce applies for exactly one call',
    run: async ({ mod, expect }) => {
      const { fn } = mod as unknown as Mod;
      const m = fn();
      m.mockReturnValue('default');
      expect(m()).to.equal('default');
      m.mockImplementationOnce(() => 'first');
      expect(m()).to.equal('first');
      expect(m()).to.equal('default');
      expect(m()).to.equal('default');
    },
  },
  {
    name: 'mockResolvedValue makes the mock return an already-resolved promise',
    run: async ({ mod, expect }) => {
      const { fn } = mod as unknown as Mod;
      const m = fn();
      m.mockResolvedValue(42);
      const result = await (m() as Promise<number>);
      expect(result).to.equal(42);
    },
  },
  {
    name: 'a thrown implementation still throws to the caller, and records a `throw` result',
    run: async ({ mod, expect }) => {
      const { fn } = mod as unknown as Mod;
      const m = fn(() => {
        throw new Error('boom');
      });
      expect(() => m()).to.throw('boom');
      expect(m.mock.calls).to.have.length(1);
      expect(m.mock.results[0]!.type).to.equal('throw');
      expect((m.mock.results[0]!.value as Error).message).to.equal('boom');
    },
  },
  {
    name: 'advanceBy fires a due setTimeout and a setInterval\'s multiple periods, in time order, without real waiting',
    run: async ({ mod, expect }) => {
      const { createFakeClock } = mod as unknown as Mod;
      const clock = createFakeClock();
      const order: string[] = [];
      clock.setTimeout(() => order.push('timeout@50'), 50);
      clock.setInterval(() => order.push('tick'), 20);
      const started = Date.now();
      clock.advanceBy(65);
      expect(Date.now() - started, 'must not really wait ~65ms').to.be.lessThan(30);
      // ticks at 20, 40, 60; timeout at 50 — interleaved in time order
      expect(order).to.deep.equal(['tick', 'tick', 'timeout@50', 'tick']);
    },
  },
  {
    name: 'a timer scheduled inside a firing callback still fires within the same advanceBy if it falls due',
    run: async ({ mod, expect }) => {
      const { createFakeClock } = mod as unknown as Mod;
      const clock = createFakeClock();
      const order: string[] = [];
      clock.setTimeout(() => {
        order.push('first');
        clock.setTimeout(() => order.push('scheduled-from-inside'), 10);
      }, 10);
      clock.advanceBy(25);
      expect(order).to.deep.equal(['first', 'scheduled-from-inside']);
    },
  },
  {
    name: 'clearTimeout cancels a pending timer so it never fires',
    run: async ({ mod, expect }) => {
      const { createFakeClock } = mod as unknown as Mod;
      const clock = createFakeClock();
      let fired = false;
      const id = clock.setTimeout(() => {
        fired = true;
      }, 30);
      clock.clearTimeout(id);
      clock.advanceBy(100);
      expect(fired).to.equal(false);
    },
  },
];
