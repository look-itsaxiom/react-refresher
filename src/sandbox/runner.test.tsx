import { describe, it, expect } from 'vitest';
import { runChecks } from './runner';
import { baseRegistry } from './registry';
import type { Check } from '../content/types';

const counterFiles = {
  'App.tsx': `
    import { useState } from 'react';
    export default function App() {
      const [n, setN] = useState(0);
      return <button onClick={() => setN(n + 1)}>Count {n}</button>;
    }
  `,
};

const checks: Check[] = [
  {
    name: 'renders 0',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      expect(screen.getByRole('button').textContent).to.equal('Count 0');
    },
  },
  {
    name: 'increments',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.click(screen.getByRole('button'));
      expect(screen.getByRole('button').textContent).to.equal('Count 1');
    },
  },
  {
    name: 'a failing assertion',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      expect(screen.getByRole('button').textContent).to.equal('nope');
    },
  },
];

describe('runChecks', () => {
  it('runs each check in isolation and reports pass/fail with messages', async () => {
    const out = await runChecks({ files: counterFiles, checks, registry: baseRegistry });
    expect(out.kind).toBe('results');
    if (out.kind !== 'results') return;
    expect(out.results.map((r) => r.status)).toEqual(['pass', 'pass', 'fail']);
    expect(out.results[2]?.error).toContain('nope');
    expect(out.allPassed).toBe(false);
    expect(document.body.innerHTML).toBe(''); // cleaned up between and after checks
  });

  it('removes nodes a check appended to document.body before the next check runs', async () => {
    const leaky: Check[] = [
      { name: 'appends', run: async () => { const el = document.createElement('div'); el.id = 'leaked'; document.body.append(el); } },
      { name: 'sees clean body', run: async ({ expect }) => { expect(document.getElementById('leaked')).to.equal(null); } },
    ];
    const out = await runChecks({ files: { 'App.tsx': 'export default () => null;' }, checks: leaky, registry: baseRegistry });
    expect(out.kind).toBe('results');
    if (out.kind === 'results') expect(out.results.map((r) => r.status)).toEqual(['pass', 'pass']);
  });

  it('reports compile errors instead of results', async () => {
    const out = await runChecks({ files: { 'App.tsx': 'export default function App() { return <p>; }' }, checks, registry: baseRegistry });
    expect(out.kind).toBe('compile-error');
  });

  it('reports unknown imports as compile errors', async () => {
    const out = await runChecks({ files: { 'App.tsx': "import x from 'lodash'; export default () => x;" }, checks, registry: baseRegistry });
    expect(out.kind).toBe('compile-error');
    if (out.kind === 'compile-error') expect(out.error.message).toContain('lodash');
  });

  it('fails a check that exceeds the timeout', async () => {
    const original = console.error;
    const slow: Check[] = [{ name: 'hangs', run: () => new Promise(() => {}) }];
    const out = await runChecks({ files: counterFiles, checks: slow, registry: baseRegistry, timeoutMs: 50 });
    if (out.kind !== 'results') throw new Error('expected results');
    expect(out.results[0]?.status).toBe('fail');
    expect(out.results[0]?.error).toMatch(/timed out/i);
    // A hanging check must not leave console.error permanently muted for later checks/tests.
    expect(console.error).toBe(original);
  });

  it('evaluates the module lazily per check so server config applies first', async () => {
    const files = {
      'App.tsx': `
        import { fetchUser } from '@server/users';
        export const started = performance.now();
        export const p = fetchUser(1);
        export default function App() { return null; }
      `,
    };
    const timing: Check[] = [
      {
        // `mod` is a getter that evaluates the user's module on first access, so we read
        // `ctx.mod` here (after configuring the server) rather than destructuring it in the
        // parameter list, which would force evaluation before `setLatency` runs.
        name: 'latency set before evaluation is honored',
        run: async (ctx) => {
          ctx.server.setLatency(30);
          const t0 = performance.now();
          await (ctx.mod.p as Promise<unknown>);
          ctx.expect(performance.now() - t0).to.be.greaterThanOrEqual(25);
        },
      },
    ];
    const out = await runChecks({ files, checks: timing, registry: baseRegistry });
    if (out.kind !== 'results') throw new Error('expected results');
    expect(out.results[0]).toMatchObject({ status: 'pass' });
  });

  it('a runtime error during render is reported as a failed check, not a crash', async () => {
    const files = { 'App.tsx': 'export default function App() { throw new Error("kaboom"); }' };
    const c: Check[] = [{ name: 'renders', run: ({ render, Component }) => { render(<Component />); } }];
    const out = await runChecks({ files, checks: c, registry: baseRegistry });
    if (out.kind !== 'results') throw new Error('expected results');
    expect(out.results[0]?.status).toBe('fail');
    expect(out.results[0]?.error).toContain('kaboom');
  });

  it('a runtime error while loading the module (not during render) fails the check, not a compile error', async () => {
    // The throw happens as soon as the module is evaluated, before Component even exists, so this
    // must NOT be reported as a compile-error outcome (it isn't a syntax/import problem).
    const files = { 'App.tsx': 'throw new Error("top-level boom"); export default () => null;' };
    const c: Check[] = [{ name: 'renders', run: ({ render, Component }) => { render(<Component />); } }];
    const out = await runChecks({ files, checks: c, registry: baseRegistry });
    expect(out.kind).toBe('results');
    if (out.kind !== 'results') return;
    expect(out.results[0]?.status).toBe('fail');
    expect(out.results[0]?.error).toContain('top-level boom');
  });
});
