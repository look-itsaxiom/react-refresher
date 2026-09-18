import { useEffect, useState } from 'react';

export type Mock<Args extends unknown[] = unknown[], Ret = unknown> = ((...args: Args) => Ret) & {
  mock: { calls: Args[]; results: { type: 'return' | 'throw'; value: unknown }[] };
  mockReturnValue: (value: Ret) => Mock<Args, Ret>;
  mockResolvedValue: (value: Awaited<Ret>) => Mock<Args, Ret>;
  mockImplementationOnce: (impl: (...args: Args) => Ret) => Mock<Args, Ret>;
};

export function fn<Args extends unknown[] = unknown[], Ret = unknown>(impl?: (...args: Args) => Ret): Mock<Args, Ret> {
  let defaultImpl: ((...args: Args) => Ret) | undefined = impl;
  const onceQueue: Array<(...args: Args) => Ret> = [];

  const mockFn = ((...args: Args) => {
    const chosen = onceQueue.shift() ?? defaultImpl;
    try {
      const value = chosen ? chosen(...args) : (undefined as Ret);
      mockFn.mock.calls.push(args);
      mockFn.mock.results.push({ type: 'return', value });
      return value;
    } catch (error) {
      mockFn.mock.calls.push(args);
      mockFn.mock.results.push({ type: 'throw', value: error });
      throw error;
    }
  }) as Mock<Args, Ret>;

  mockFn.mock = { calls: [], results: [] };

  mockFn.mockReturnValue = (value: Ret) => {
    defaultImpl = () => value;
    return mockFn;
  };
  mockFn.mockResolvedValue = (value: Awaited<Ret>) => {
    defaultImpl = () => Promise.resolve(value) as Ret;
    return mockFn;
  };
  mockFn.mockImplementationOnce = (implOnce: (...args: Args) => Ret) => {
    onceQueue.push(implOnce);
    return mockFn;
  };

  return mockFn;
}

export type FakeClock = {
  setTimeout: (cb: () => void, ms: number) => number;
  setInterval: (cb: () => void, ms: number) => number;
  clearTimeout: (id: number) => void;
  clearInterval: (id: number) => void;
  advanceBy: (ms: number) => void;
  runAll: () => void;
};

type Timer = { id: number; time: number; cb: () => void; intervalMs: number | null };

export function createFakeClock(): FakeClock {
  let now = 0;
  let nextId = 1;
  const timers = new Map<number, Timer>();

  function schedule(cb: () => void, delay: number, intervalMs: number | null): number {
    const id = nextId++;
    timers.set(id, { id, time: now + delay, cb, intervalMs });
    return id;
  }

  function setTimeoutFake(cb: () => void, ms: number) {
    return schedule(cb, ms, null);
  }
  function setIntervalFake(cb: () => void, ms: number) {
    return schedule(cb, ms, ms);
  }
  function clear(id: number) {
    timers.delete(id);
  }

  function fireUpTo(target: number) {
    const guard = 10_000;
    let iterations = 0;
    for (;;) {
      let next: Timer | undefined;
      for (const timer of timers.values()) {
        if (timer.time > target) continue;
        if (!next || timer.time < next.time || (timer.time === next.time && timer.id < next.id)) next = timer;
      }
      if (!next) break;
      now = next.time;
      if (next.intervalMs == null) {
        timers.delete(next.id);
      } else {
        next.time = now + next.intervalMs;
      }
      next.cb();
      iterations++;
      if (iterations > guard) {
        throw new Error('createFakeClock: too many timer firings — check for a runaway interval');
      }
    }
    if (target > now) now = target;
  }

  return {
    setTimeout: setTimeoutFake,
    setInterval: setIntervalFake,
    clearTimeout: clear,
    clearInterval: clear,
    advanceBy: (ms: number) => fireUpTo(now + ms),
    runAll: () => fireUpTo(Infinity),
  };
}

function Demo() {
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    const clock = createFakeClock();
    const entries: string[] = [];
    clock.setTimeout(() => entries.push('one-shot at 50'), 50);
    clock.setInterval(() => entries.push('tick'), 20);
    clock.advanceBy(65);
    setLog(entries);
  }, []);

  return (
    <div style={{ padding: 16, fontFamily: 'monospace' }}>
      <h2>Mocks and fake time</h2>
      <pre>{JSON.stringify(log, null, 2)}</pre>
    </div>
  );
}

export default Demo;
