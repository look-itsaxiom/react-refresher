import type { SandboxState } from './sandbox-reducer';

export function ChecksPanel({ state, total }: { state: SandboxState; total: number }) {
  if (state.phase === 'compile-error' && state.error) {
    return (
      <div className="p-3 text-sm">
        <p className="text-danger font-medium">Compile error{state.error.filename ? ` in ${state.error.filename}` : ''}{state.error.line ? ` (line ${state.error.line})` : ''}</p>
        <pre className="mt-1 whitespace-pre-wrap text-xs text-danger/90">{state.error.message}</pre>
      </div>
    );
  }
  if (state.phase === 'runtime-error' && state.error) {
    return (
      <div className="p-3 text-sm">
        <p className="text-danger font-medium">Runtime error</p>
        <pre className="mt-1 whitespace-pre-wrap text-xs text-danger/90">{state.error.message}</pre>
      </div>
    );
  }
  if (state.phase === 'checking') return <p className="p-3 text-sm text-ink-muted">Running {total} checks…</p>;
  if (!state.results) return <p className="p-3 text-sm text-ink-muted">Press <kbd className="rounded border border-border px-1">Ctrl</kbd>+<kbd className="rounded border border-border px-1">Enter</kbd> or “Run checks” to grade your code.</p>;
  const passed = state.results.filter((r) => r.status === 'pass').length;
  return (
    <div className="p-3 text-sm">
      <p className={`font-medium ${state.allPassed ? 'text-success' : 'text-warning'}`}>
        {state.allPassed ? 'All checks passed!' : `${passed} of ${state.results.length} checks passed`}
      </p>
      <ul className="mt-2 space-y-1.5">
        {state.results.map((r) => (
          <li key={r.name} className="flex gap-2">
            <span className={r.status === 'pass' ? 'text-success' : 'text-danger'} aria-hidden>{r.status === 'pass' ? '✓' : '✗'}</span>
            <div className="min-w-0">
              <p>{r.name}</p>
              {r.error && <pre className="mt-0.5 whitespace-pre-wrap text-xs text-danger/90">{r.error}</pre>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
