import { useEffect, useState } from 'react';

export type HookFn = () => void | Promise<void>;
export type TestFn = () => void | Promise<void>;

export type TestReport = {
  passed: number;
  failed: { fullName: string; error: string }[];
  skipped: number;
};

export type ItFn = ((name: string, fn: TestFn) => void) & {
  skip: (name: string, fn: TestFn) => void;
  only: (name: string, fn: TestFn) => void;
};

export type Runner = {
  describe: (name: string, fn: () => void) => void;
  it: ItFn;
  beforeEach: (fn: HookFn) => void;
  afterEach: (fn: HookFn) => void;
  run: () => Promise<TestReport>;
};

// TODO: build a tiny, real test runner.
//
// - `describe(name, fn)` nests a suite; `fn` runs immediately (synchronously) to register
//   its children.
// - `it(name, fn)` registers a test in the current suite. `it.skip(name, fn)` registers it
//   but never runs it (counts toward `skipped`). `it.only(name, fn)` — if ANY test anywhere
//   in the tree uses `.only`, only `.only` tests run; every other test counts as `skipped`
//   instead of running.
// - `beforeEach(fn)` / `afterEach(fn)` register hooks on the *current* suite (root counts as
//   a suite). For a given test, every ancestor's `beforeEach` runs outermost-first, then the
//   test, then every ancestor's `afterEach` runs innermost-first — and `afterEach` hooks run
//   even if the test failed.
// - Tests may be async. Each test gets a fixed timeout (`options.timeoutMs`, default 2000);
//   a test that doesn't settle in time counts as failed with a timeout error.
// - `run()` executes the whole tree and resolves a report: `passed` (count), `skipped`
//   (count), and `failed` (one entry per failing test, `{ fullName, error }` where `fullName`
//   joins ancestor describe names and the test name with " > ", and `error` is the thrown
//   error's message).
export function createRunner(options: { timeoutMs?: number } = {}): Runner {
  void options;
  return {
    describe() {},
    it: Object.assign(() => {}, { skip: () => {}, only: () => {} }) as ItFn,
    beforeEach() {},
    afterEach() {},
    async run() {
      return { passed: 0, failed: [], skipped: 0 };
    },
  };
}

function Demo() {
  const [report, setReport] = useState<TestReport | null>(null);

  useEffect(() => {
    const log: string[] = [];
    const runner = createRunner();
    runner.describe('math', () => {
      runner.beforeEach(() => {
        log.push('setup');
      });
      runner.it('adds', () => {
        log.push('adds');
        if (1 + 1 !== 2) throw new Error('nope');
      });
      runner.it('subtracts', () => {
        log.push('subtracts');
      });
    });
    runner.run().then(setReport);
  }, []);

  return (
    <div style={{ padding: 16, fontFamily: 'monospace' }}>
      <h2>Mini test runner</h2>
      <pre>{report ? JSON.stringify(report, null, 2) : 'running…'}</pre>
    </div>
  );
}

export default Demo;
