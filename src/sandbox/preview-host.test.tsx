import { describe, it, expect, vi, afterEach } from 'vitest';
import { createPreviewHost } from './preview-host';
import { baseRegistry } from './registry';
import type { FrameToParent, ParentToFrame } from './protocol';
import type { Check } from '../content/types';

function setup(checks: Check[] | undefined) {
  const posted: FrameToParent[] = [];
  const mount = document.createElement('div');
  document.body.appendChild(mount);
  const host = createPreviewHost({
    post: (m) => posted.push(m),
    registry: baseRegistry,
    findChecks: () => checks,
    mount,
  });
  return { host, posted, mount };
}

const run = (over: Partial<ParentToFrame>): ParentToFrame => ({
  type: 'run', runId: 1, exerciseKey: 'l/e', entry: 'App.tsx', mode: 'preview',
  files: { 'App.tsx': 'export default function App() { return <h1>Hi there</h1>; }' },
  ...over,
});

describe('preview host', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders the default export into the mount and posts preview-ok', async () => {
    const { host, posted, mount } = setup([]);
    await host.handle(run({}));
    expect(mount.textContent).toContain('Hi there');
    expect(posted).toContainEqual({ type: 'preview-ok', runId: 1 });
  });

  it('replaces the previous render on the next run', async () => {
    const { host, mount } = setup([]);
    await host.handle(run({}));
    await host.handle(run({ runId: 2, files: { 'App.tsx': 'export default () => <p>Second</p>;' } }));
    expect(mount.textContent).toBe('Second');
  });

  it('posts compile-error with location for broken code', async () => {
    const { host, posted } = setup([]);
    await host.handle(run({ files: { 'App.tsx': 'export default function App() { return <p>; }' } }));
    const err = posted.find((m) => m.type === 'compile-error');
    expect(err).toBeDefined();
    if (err?.type === 'compile-error') expect(err.filename).toBe('App.tsx');
  });

  it('posts runtime-error when rendering throws, and shows an error card', async () => {
    const { host, posted, mount } = setup([]);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await host.handle(run({ files: { 'App.tsx': 'export default function App() { throw new Error("nope"); }' } }));
    spy.mockRestore();
    expect(posted.some((m) => m.type === 'runtime-error' && m.message.includes('nope'))).toBe(true);
    expect(mount.textContent).toContain('nope');
  });

  it('runs checks, posts results, and re-renders the preview afterwards', async () => {
    const checks: Check[] = [
      { name: 'has heading', run: ({ render, screen, expect, Component }) => { render(<Component />); expect(screen.getByRole('heading').textContent).to.equal('Hi there'); } },
    ];
    const { host, posted, mount } = setup(checks);
    await host.handle(run({ mode: 'checks', runId: 7 }));
    const results = posted.find((m) => m.type === 'check-results');
    expect(results).toMatchObject({ type: 'check-results', runId: 7, allPassed: true });
    expect(mount.textContent).toContain('Hi there');
  });

  it('reports an unknown exercise as a failed check result', async () => {
    const { host, posted } = setup(undefined);
    await host.handle(run({ mode: 'checks' }));
    const results = posted.find((m) => m.type === 'check-results');
    expect(results).toMatchObject({ allPassed: false });
  });
});
