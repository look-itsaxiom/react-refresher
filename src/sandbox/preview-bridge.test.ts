import { describe, it, expect, vi } from 'vitest';
import { createFrameMessageHandler } from './preview-bridge';
import type { ParentToFrame } from './protocol';

const ORIGIN = 'http://localhost:5180';

function runMsg(runId: number): ParentToFrame {
  return { type: 'run', runId, exerciseKey: 'l/e', files: { 'App.tsx': 'x' }, entry: 'App.tsx', mode: 'preview' };
}

function makeEvent(data: unknown, opts: { origin?: string; source?: unknown } = {}): MessageEvent<unknown> {
  return {
    data,
    origin: opts.origin ?? ORIGIN,
    source: opts.source ?? (window as unknown as Window),
  } as MessageEvent<unknown>;
}

describe('createFrameMessageHandler', () => {
  it('ignores messages from the wrong origin', () => {
    const handle = vi.fn(async () => {});
    const post = vi.fn();
    const onMessage = createFrameMessageHandler({ handle, post, expectedOrigin: ORIGIN, parentWindow: window });
    onMessage(makeEvent(runMsg(1), { origin: 'http://evil.example' }));
    expect(handle).not.toHaveBeenCalled();
  });

  it('ignores messages from the wrong source', () => {
    const handle = vi.fn(async () => {});
    const post = vi.fn();
    const otherWindow = { name: 'not-parent' } as unknown as Window;
    const onMessage = createFrameMessageHandler({ handle, post, expectedOrigin: ORIGIN, parentWindow: window });
    onMessage(makeEvent(runMsg(1), { source: otherWindow }));
    expect(handle).not.toHaveBeenCalled();
  });

  it('ignores non-run data', () => {
    const handle = vi.fn(async () => {});
    const post = vi.fn();
    const onMessage = createFrameMessageHandler({ handle, post, expectedOrigin: ORIGIN, parentWindow: window });
    onMessage(makeEvent({ type: 'ready' }));
    onMessage(makeEvent(null));
    onMessage(makeEvent('not an object'));
    expect(handle).not.toHaveBeenCalled();
  });

  it('handles two runs in order, the second waiting for the first', async () => {
    const order: number[] = [];
    let resolveFirst: () => void = () => {};
    const handle = vi.fn((msg: ParentToFrame) => {
      if (msg.runId === 1) {
        return new Promise<void>((resolve) => {
          resolveFirst = () => { order.push(1); resolve(); };
        });
      }
      order.push(2);
      return Promise.resolve();
    });
    const post = vi.fn();
    const onMessage = createFrameMessageHandler({ handle, post, expectedOrigin: ORIGIN, parentWindow: window });

    onMessage(makeEvent(runMsg(1)));
    onMessage(makeEvent(runMsg(2)));

    // The second run must not have started yet: the first hasn't resolved.
    await Promise.resolve();
    await Promise.resolve();
    expect(order).toEqual([]);

    resolveFirst();
    await vi.waitFor(() => expect(order).toEqual([1, 2]));
  });

  it('posts runtime-error with the run id when handle rejects', async () => {
    const handle = vi.fn(async (msg: ParentToFrame) => {
      throw new Error(`boom-${msg.runId}`);
    });
    const post = vi.fn();
    const onMessage = createFrameMessageHandler({ handle, post, expectedOrigin: ORIGIN, parentWindow: window });

    onMessage(makeEvent(runMsg(7)));

    await vi.waitFor(() => expect(post).toHaveBeenCalledWith({ type: 'runtime-error', runId: 7, message: 'boom-7' }));
  });
});
