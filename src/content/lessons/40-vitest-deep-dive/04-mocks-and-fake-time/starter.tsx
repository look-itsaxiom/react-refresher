import { useEffect, useState } from 'react';

export type Mock<Args extends unknown[] = unknown[], Ret = unknown> = ((...args: Args) => Ret) & {
  mock: { calls: Args[]; results: { type: 'return' | 'throw'; value: unknown }[] };
  mockReturnValue: (value: Ret) => Mock<Args, Ret>;
  mockResolvedValue: (value: Awaited<Ret>) => Mock<Args, Ret>;
  mockImplementationOnce: (impl: (...args: Args) => Ret) => Mock<Args, Ret>;
};

// TODO: a minimal stand-in for `vi.fn`.
//
// - Calling the returned function records the arguments in `mock.calls` (one entry per call)
//   and the outcome in `mock.results` (`{ type: 'return', value }` normally, `{ type: 'throw',
//   value: error }` if the chosen implementation threw — and the mock still re-throws in that
//   case, it doesn't swallow the error).
// - `mockReturnValue(v)` makes every future call (that isn't covered by a queued "once") return
//   `v`.
// - `mockResolvedValue(v)` is `mockReturnValue(Promise.resolve(v))`.
// - `mockImplementationOnce(impl)` queues `impl` to be used for exactly the next call only, then
//   falls back to whatever `mockReturnValue` set (or `impl` passed to `fn`, or `undefined`).
export function fn<Args extends unknown[] = unknown[], Ret = unknown>(impl?: (...args: Args) => Ret): Mock<Args, Ret> {
  const mockFn = ((...args: Args) => (impl ? impl(...args) : undefined)) as Mock<Args, Ret>;
  mockFn.mock = { calls: [], results: [] };
  mockFn.mockReturnValue = () => mockFn;
  mockFn.mockResolvedValue = () => mockFn;
  mockFn.mockImplementationOnce = () => mockFn;
  return mockFn;
}

export type FakeClock = {
  setTimeout: (cb: () => void, ms: number) => number;
  setInterval: (cb: () => void, ms: number) => number;
  clearTimeout: (id: number) => void;
  clearInterval: (id: number) => void;
  /** Fires every due timer, in order, as if `ms` of real time passed — synchronously, no real waiting. */
  advanceBy: (ms: number) => void;
  /** Fires every currently- and newly-scheduled timer until none remain due. Guards against infinite intervals. */
  runAll: () => void;
};

// TODO: a controllable clock. Timers never fire on their own — only `advanceBy`/`runAll` fire
// them. A `setInterval` timer reschedules itself for `+ms` each time it fires, so a single
// `advanceBy` call spanning several periods fires it multiple times, in order. A timer
// scheduled *inside* a firing callback (with a small enough delay) must also fire within the
// same `advanceBy`/`runAll` call if its due time falls within the window being advanced.
export function createFakeClock(): FakeClock {
  return {
    setTimeout: () => 0,
    setInterval: () => 0,
    clearTimeout: () => {},
    clearInterval: () => {},
    advanceBy: () => {},
    runAll: () => {},
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
