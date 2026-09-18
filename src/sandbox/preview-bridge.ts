import type { FrameToParent, ParentToFrame } from './protocol';

export type FrameMessageHandlerDeps = {
  /** Runs one `run` message (preview or checks) against the sandbox host. */
  handle(msg: ParentToFrame): Promise<void>;
  post(msg: FrameToParent): void;
  /** Only messages from this origin are accepted. */
  expectedOrigin: string;
  /** Only messages whose `event.source` is this window are accepted. */
  parentWindow: Window;
};

/**
 * Builds the iframe's `message` listener. Pulled out of `preview-main.tsx` so the
 * origin/source filtering and run-serialization logic can be unit-tested without a real iframe.
 */
export function createFrameMessageHandler(deps: FrameMessageHandlerDeps): (event: MessageEvent<unknown>) => void {
  const { handle, post, expectedOrigin, parentWindow } = deps;
  let queue: Promise<void> = Promise.resolve();

  return (event: MessageEvent<unknown>) => {
    if (event.source !== parentWindow) return;
    if (event.origin !== expectedOrigin) return;
    const data = event.data as Partial<ParentToFrame> | null;
    if (!data || data.type !== 'run') return;
    const msg = data as ParentToFrame;
    // Serialize runs so a checks run and a preview run never interleave.
    queue = queue.then(() => handle(msg)).catch((e: unknown) => {
      post({ type: 'runtime-error', runId: msg.runId, message: e instanceof Error ? e.message : String(e) });
    });
  };
}
