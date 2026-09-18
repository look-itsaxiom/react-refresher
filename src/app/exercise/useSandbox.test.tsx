import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { useSandbox } from './useSandbox';
import type { ParentToFrame } from '../../sandbox/protocol';

function Harness({ onReady }: { onReady: (sandbox: ReturnType<typeof useSandbox>) => void }) {
  const sandbox = useSandbox();
  onReady(sandbox);
  return <iframe ref={sandbox.iframeRef} title="Preview" />;
}

describe('useSandbox', () => {
  it('only becomes ready for messages from its own iframe, and runChecks posts a checks run', () => {
    let latest!: ReturnType<typeof useSandbox>;
    const { container } = render(<Harness onReady={(s) => { latest = s; }} />);
    const iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();
    const contentWindow = iframe!.contentWindow;
    expect(contentWindow).not.toBeNull();

    act(() => {
      window.dispatchEvent(new MessageEvent('message', { data: { type: 'ready' }, source: window }));
    });
    expect(latest.state.ready).toBe(false);

    act(() => {
      window.dispatchEvent(new MessageEvent('message', { data: { type: 'ready' }, source: contentWindow! }));
    });
    expect(latest.state.ready).toBe(true);

    const postSpy = vi.spyOn(contentWindow!, 'postMessage');
    act(() => {
      latest.runChecks({ 'App.tsx': 'x' }, 'App.tsx', 'l/e');
    });

    expect(postSpy).toHaveBeenCalledTimes(1);
    const sent = postSpy.mock.calls[0]?.[0] as ParentToFrame;
    expect(sent.type).toBe('run');
    expect(sent.mode).toBe('checks');
    expect(sent.exerciseKey).toBe('l/e');
    expect(latest.state.phase).toBe('checking');
  });
});
