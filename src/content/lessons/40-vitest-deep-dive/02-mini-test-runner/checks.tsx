import type { Check } from '../../../types';

type TestFn = () => void | Promise<void>;
type HookFn = () => void | Promise<void>;
type TestReport = { passed: number; failed: { fullName: string; error: string }[]; skipped: number };
type ItFn = ((name: string, fn: TestFn) => void) & { skip: (name: string, fn: TestFn) => void; only: (name: string, fn: TestFn) => void };
type Runner = {
  describe: (name: string, fn: () => void) => void;
  it: ItFn;
  beforeEach: (fn: HookFn) => void;
  afterEach: (fn: HookFn) => void;
  run: () => Promise<TestReport>;
};
type Mod = { createRunner: (options?: { timeoutMs?: number }) => Runner };

export const checks: Check[] = [
  {
    name: 'runs beforeEach outermost-first and afterEach innermost-first, around the test',
    run: async ({ mod, expect }) => {
      const { createRunner } = mod as unknown as Mod;
      const log: string[] = [];
      const runner = createRunner();
      runner.beforeEach(() => {
        log.push('outer before');
      });
      runner.afterEach(() => {
        log.push('outer after');
      });
      runner.describe('inner suite', () => {
        runner.beforeEach(() => {
          log.push('inner before');
        });
        runner.afterEach(() => {
          log.push('inner after');
        });
        runner.it('does the thing', () => {
          log.push('test');
        });
      });
      const report = await runner.run();
      expect(log).to.deep.equal(['outer before', 'inner before', 'test', 'inner after', 'outer after']);
      expect(report).to.deep.equal({ passed: 1, failed: [], skipped: 0 });
    },
  },
  {
    name: 'a thrown error is recorded in `failed` with a dotted fullName, and does not stop later tests',
    run: async ({ mod, expect }) => {
      const { createRunner } = mod as unknown as Mod;
      const runner = createRunner();
      runner.describe('group', () => {
        runner.it('breaks', () => {
          throw new Error('boom');
        });
        runner.it('is fine', () => {});
      });
      const report = await runner.run();
      expect(report.passed).to.equal(1);
      expect(report.skipped).to.equal(0);
      expect(report.failed).to.have.length(1);
      expect(report.failed[0]!.fullName).to.equal('group > breaks');
      expect(report.failed[0]!.error).to.equal('boom');
    },
  },
  {
    name: 'afterEach still runs when the test throws',
    run: async ({ mod, expect }) => {
      const { createRunner } = mod as unknown as Mod;
      const log: string[] = [];
      const runner = createRunner();
      runner.afterEach(() => {
        log.push('cleanup');
      });
      runner.it('breaks', () => {
        throw new Error('nope');
      });
      await runner.run();
      expect(log).to.deep.equal(['cleanup']);
    },
  },
  {
    name: 'a test that never settles fails with a timeout instead of hanging the run',
    run: async ({ mod, expect }) => {
      const { createRunner } = mod as unknown as Mod;
      const runner = createRunner({ timeoutMs: 30 });
      runner.it('hangs', () => new Promise(() => {}));
      const started = Date.now();
      const report = await runner.run();
      expect(Date.now() - started, 'should not wait far past the timeout').to.be.lessThan(300);
      expect(report.failed).to.have.length(1);
      expect(report.failed[0]!.error).to.match(/timed out/i);
    },
  },
  {
    name: 'it.skip never calls its function and counts toward `skipped`, not `passed` or `failed`',
    run: async ({ mod, expect }) => {
      const { createRunner } = mod as unknown as Mod;
      const runner = createRunner();
      let called = false;
      runner.it.skip('later', () => {
        called = true;
      });
      runner.it('now', () => {});
      const report = await runner.run();
      expect(called).to.equal(false);
      expect(report).to.deep.equal({ passed: 1, failed: [], skipped: 1 });
    },
  },
  {
    name: 'it.only runs only the `.only` tests anywhere in the tree; every other test is skipped, not run',
    run: async ({ mod, expect }) => {
      const { createRunner } = mod as unknown as Mod;
      const runner = createRunner();
      const ran: string[] = [];
      runner.describe('a', () => {
        runner.it('normal one', () => {
          ran.push('normal one');
        });
        runner.it.only('the chosen one', () => {
          ran.push('the chosen one');
        });
      });
      runner.it('normal two', () => {
        ran.push('normal two');
      });
      const report = await runner.run();
      expect(ran).to.deep.equal(['the chosen one']);
      expect(report).to.deep.equal({ passed: 1, failed: [], skipped: 2 });
    },
  },
];
