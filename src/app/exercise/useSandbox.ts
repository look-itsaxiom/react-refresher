import { useCallback, useEffect, useReducer, useRef } from 'react';
import { isFrameToParent, type ParentToFrame } from '../../sandbox/protocol';
import { initialSandboxState, sandboxReducer } from './sandbox-reducer';

let runCounter = 0;

export function useSandbox() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [state, dispatch] = useReducer(sandboxReducer, initialSandboxState);

  useEffect(() => {
    function onMessage(event: MessageEvent<unknown>) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (!isFrameToParent(event.data)) return;
      dispatch({ type: 'message', msg: event.data });
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const send = useCallback((mode: ParentToFrame['mode'], files: Record<string, string>, entry: string, exerciseKey: string) => {
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    const runId = ++runCounter;
    dispatch({ type: 'start', runId, mode });
    const msg: ParentToFrame = { type: 'run', runId, mode, files, entry, exerciseKey };
    target.postMessage(msg, window.location.origin);
  }, []);

  return {
    state,
    iframeRef,
    runPreview: useCallback((files: Record<string, string>, entry: string, key: string) => send('preview', files, entry, key), [send]),
    runChecks: useCallback((files: Record<string, string>, entry: string, key: string) => send('checks', files, entry, key), [send]),
    clearLogs: useCallback(() => dispatch({ type: 'clear-logs' }), []),
  };
}
