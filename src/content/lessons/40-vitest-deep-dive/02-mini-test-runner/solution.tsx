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

type Mode = 'normal' | 'skip' | 'only';

type TestNode = { kind: 'test'; name: string; fn: TestFn; mode: Mode };
type SuiteNode = {
  kind: 'suite';
  name: string | null;
  children: (TestNode | SuiteNode)[];
  beforeEachHooks: HookFn[];
  afterEachHooks: HookFn[];
};

function runWithTimeout(fn: TestFn, ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(`test timed out after ${ms}ms`));
    }, ms);
    Promise.resolve()
      .then(() => fn())
      .then(() => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve();
      })
      .catch((err: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      });
  });
}

export function createRunner(options: { timeoutMs?: number } = {}): Runner {
  const timeoutMs = options.timeoutMs ?? 2000;
  const root: SuiteNode = { kind: 'suite', name: null, children: [], beforeEachHooks: [], afterEachHooks: [] };
  let current: SuiteNode = root;

  function describe(name: string, fn: () => void) {
    const suite: SuiteNode = { kind: 'suite', name, children: [], beforeEachHooks: [], afterEachHooks: [] };
    current.children.push(suite);
    const previous = current;
    current = suite;
    try {
      fn();
    } finally {
      current = previous;
    }
  }

  function registerTest(name: string, fn: TestFn, mode: Mode) {
    current.children.push({ kind: 'test', name, fn, mode });
  }

  const it = ((name: string, fn: TestFn) => registerTest(name, fn, 'normal')) as ItFn;
  it.skip = (name, fn) => registerTest(name, fn, 'skip');
  it.only = (name, fn) => registerTest(name, fn, 'only');

  function beforeEach(fn: HookFn) {
    current.beforeEachHooks.push(fn);
  }
  function afterEach(fn: HookFn) {
    current.afterEachHooks.push(fn);
  }

  function collect(suite: SuiteNode, chain: SuiteNode[], out: { test: TestNode; chain: SuiteNode[] }[]) {
    const nextChain = [...chain, suite];
    for (const child of suite.children) {
      if (child.kind === 'suite') collect(child, nextChain, out);
      else out.push({ test: child, chain: nextChain });
    }
  }

  async function run(): Promise<TestReport> {
    const all: { test: TestNode; chain: SuiteNode[] }[] = [];
    collect(root, [], all);
    const hasOnly = all.some(({ test }) => test.mode === 'only');

    const report: TestReport = { passed: 0, failed: [], skipped: 0 };

    for (const { test, chain } of all) {
      const fullName = [...chain.map((s) => s.name).filter((n): n is string => n !== null), test.name].join(' > ');
      const shouldSkip = test.mode === 'skip' || (hasOnly && test.mode !== 'only');
      if (shouldSkip) {
        report.skipped++;
        continue;
      }

      let failure: unknown = null;
      try {
        for (const suite of chain) {
          for (const hook of suite.beforeEachHooks) await hook();
        }
        await runWithTimeout(test.fn, timeoutMs);
      } catch (err) {
        failure = err;
      } finally {
        for (let i = chain.length - 1; i >= 0; i--) {
          for (const hook of chain[i]!.afterEachHooks) {
            try {
              await hook();
            } catch {
              // an afterEach failure doesn't overwrite an already-recorded test failure/success here;
              // keeping teardown best-effort matches most real runners' behavior.
            }
          }
        }
      }

      if (failure) {
        report.failed.push({ fullName, error: failure instanceof Error ? failure.message : String(failure) });
      } else {
        report.passed++;
      }
    }

    return report;
  }

  return { describe, it, beforeEach, afterEach, run };
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
