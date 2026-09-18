import { Component, createElement, type ErrorInfo, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import type { Check, SqlDb } from '../content/types';
import { CompileError } from './compile';
import { evaluate, ModuleNotFoundError, type ModuleRegistry } from './modules';
import type { FrameToParent, ParentToFrame } from './protocol';
import { formatError, getComponent, runChecks } from './runner';
import { createSqlDb as defaultCreateSqlDb } from './sql/db';
import { runSqlChecks, runSqlScript } from './sql/runSqlChecks';

type Deps = {
  post(msg: FrameToParent): void;
  registry: ModuleRegistry;
  findChecks(exerciseKey: string): Check[] | undefined;
  mount: HTMLElement;
  createSqlDb?: () => Promise<SqlDb>;
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
  const createSqlDb = deps.createSqlDb ?? defaultCreateSqlDb;

  function unmount() {
    if (root) {
      root.unmount();
      root = null;
    }
  }

  function renderSqlGrid(result: Awaited<ReturnType<typeof runSqlScript>>): void {
    unmount();
    deps.mount.textContent = '';
    if (result.error) {
      const pre = document.createElement('pre');
      pre.style.cssText = 'color:#f87171;white-space:pre-wrap;font-size:13px';
      pre.textContent = result.error;
      deps.mount.appendChild(pre);
      return;
    }
    const table = document.createElement('table');
    table.style.cssText = 'border-collapse:collapse;font:12px ui-monospace,monospace';
    const head = table.createTHead().insertRow();
    for (const c of result.columns) { const th = document.createElement('th'); th.textContent = c; th.style.cssText = 'text-align:left;padding:4px 8px;border-bottom:1px solid #444'; head.appendChild(th); }
    const body = table.createTBody();
    for (const row of result.rows.slice(0, 200)) {
      const tr = body.insertRow();
      for (const c of result.columns) { const td = tr.insertCell(); const v = row[c]; td.textContent = v === null ? 'NULL' : typeof v === 'object' ? JSON.stringify(v) : String(v); td.style.cssText = 'padding:4px 8px;border-bottom:1px solid #2a2a2a'; }
    }
    const caption = document.createElement('p');
    caption.style.cssText = 'color:#9aa0a6;font-size:12px';
    caption.textContent = `${result.rows.length} row${result.rows.length === 1 ? '' : 's'}${result.rows.length > 200 ? ' (showing 200)' : ''} · ${result.statements} statement${result.statements === 1 ? '' : 's'}`;
    deps.mount.appendChild(table);
    deps.mount.appendChild(caption);
  }

  async function previewSql(msg: ParentToFrame): Promise<void> {
    const result = await runSqlScript(msg.files, msg.entry, createSqlDb);
    renderSqlGrid(result);
    deps.post({ type: 'sql-result', runId: msg.runId, columns: result.columns, rows: result.rows.slice(0, 200), error: result.error, statements: result.statements });
  }

  async function checkSql(msg: ParentToFrame): Promise<void> {
    const checks = deps.findChecks(msg.exerciseKey);
    if (!checks) {
      deps.post({ type: 'check-results', runId: msg.runId, allPassed: false, results: [{ name: 'exercise found', status: 'fail', error: `No checks registered for '${msg.exerciseKey}'`, durationMs: 0 }] });
      return;
    }
    await previewSql(msg);
    const outcome = await runSqlChecks({ files: msg.files, entry: msg.entry, checks, createDb: createSqlDb });
    deps.post({ type: 'check-results', runId: msg.runId, results: outcome.results, allPassed: outcome.allPassed });
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
    // Checks render into document.body (via Testing Library); hide it for the duration so the
    // preview pane doesn't flicker with check renders. The preview mount is unmounted anyway.
    // `opacity: 0` rather than `visibility: hidden`: visibility is inherited and would make every
    // descendant "inaccessible", which is exactly what Testing Library's getByRole/findByRole
    // filter out by default — most exercise checks use those and would start failing for real.
    // Opacity is not part of that accessibility check, so it hides the flicker without touching
    // query results.
    const previousOpacity = document.body.style.opacity;
    document.body.style.opacity = '0';
    try {
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
    } finally {
      document.body.style.opacity = previousOpacity;
    }
    renderPreview(msg);
  }

  return {
    async handle(msg: ParentToFrame): Promise<void> {
      if (msg.type !== 'run') return;
      if (msg.runtime === 'sql') {
        if (msg.mode === 'preview') await previewSql(msg);
        else await checkSql(msg);
        return;
      }
      if (msg.mode === 'preview') renderPreview(msg);
      else await runExerciseChecks(msg);
    },
  };
}
