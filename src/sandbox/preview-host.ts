import { Component, createElement, type ErrorInfo, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import type { Check } from '../content/types';
import { CompileError } from './compile';
import { evaluate, ModuleNotFoundError, type ModuleRegistry } from './modules';
import type { FrameToParent, ParentToFrame } from './protocol';
import { formatError, getComponent, runChecks } from './runner';

type Deps = {
  post(msg: FrameToParent): void;
  registry: ModuleRegistry;
  findChecks(exerciseKey: string): Check[] | undefined;
  mount: HTMLElement;
};

type BoundaryProps = { onError(message: string): void; children?: ReactNode };
type BoundaryState = { message: string | null };

class PreviewErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { message: null };
  static getDerivedStateFromError(e: unknown): BoundaryState {
    return { message: formatError(e) };
  }
  componentDidCatch(e: unknown, _info: ErrorInfo) {
    this.props.onError(formatError(e));
  }
  render() {
    if (this.state.message !== null) {
      return createElement(
        'div',
        { role: 'alert', style: { border: '1px solid #f87171', color: '#f87171', padding: 12, borderRadius: 8, fontFamily: 'ui-monospace, monospace', fontSize: 13 } },
        createElement('strong', null, 'Runtime error: '),
        this.state.message,
      );
    }
    return this.props.children;
  }
}

export function createPreviewHost(deps: Deps) {
  let root: Root | null = null;

  function unmount() {
    if (root) {
      root.unmount();
      root = null;
    }
  }

  function renderPreview(msg: ParentToFrame): void {
    unmount();
    let element: ReactNode;
    try {
      const mod = evaluate(msg.files, msg.entry, deps.registry);
      const App = getComponent(mod);
      element = createElement(App);
    } catch (e) {
      if (e instanceof CompileError) {
        deps.post({ type: 'compile-error', runId: msg.runId, message: e.message, filename: e.filename, line: e.line, column: e.column });
      } else if (e instanceof ModuleNotFoundError) {
        deps.post({ type: 'compile-error', runId: msg.runId, message: e.message, filename: e.from });
      } else {
        deps.post({ type: 'runtime-error', runId: msg.runId, message: formatError(e) });
      }
      deps.mount.textContent = '';
      const card = document.createElement('pre');
      card.style.cssText = 'color:#f87171;white-space:pre-wrap;font-size:13px';
      card.textContent = formatError(e);
      deps.mount.appendChild(card);
      return;
    }

    root = createRoot(deps.mount);
    let errored = false;
    const onError = (message: string) => {
      errored = true;
      deps.post({ type: 'runtime-error', runId: msg.runId, message });
    };
    // flushSync so a synchronous render error is reported before preview-ok.
    flushSync(() => {
      root?.render(createElement(PreviewErrorBoundary, { onError }, element));
    });
    if (!errored) deps.post({ type: 'preview-ok', runId: msg.runId });
  }

  async function runExerciseChecks(msg: ParentToFrame): Promise<void> {
    unmount(); // checks render into document.body; the preview must not pollute queries
    const checks = deps.findChecks(msg.exerciseKey);
    if (!checks) {
      deps.post({
        type: 'check-results',
        runId: msg.runId,
        allPassed: false,
        results: [{ name: 'exercise found', status: 'fail', error: `No checks registered for '${msg.exerciseKey}'`, durationMs: 0 }],
      });
      renderPreview(msg);
      return;
    }
    const outcome = await runChecks({ files: msg.files, entry: msg.entry, checks, registry: deps.registry });
    if (outcome.kind === 'compile-error') {
      const e = outcome.error;
      deps.post({
        type: 'compile-error',
        runId: msg.runId,
        message: e.message,
        filename: e instanceof CompileError ? e.filename : e.from,
        line: e instanceof CompileError ? e.line : undefined,
        column: e instanceof CompileError ? e.column : undefined,
      });
    } else {
      deps.post({ type: 'check-results', runId: msg.runId, results: outcome.results, allPassed: outcome.allPassed });
    }
    renderPreview(msg);
  }

  return {
    async handle(msg: ParentToFrame): Promise<void> {
      if (msg.type !== 'run') return;
      if (msg.mode === 'preview') renderPreview(msg);
      else await runExerciseChecks(msg);
    },
  };
}
