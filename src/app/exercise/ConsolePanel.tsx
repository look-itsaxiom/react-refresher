import type { LogLine } from './sandbox-reducer';
import { Button } from '../components/Button';

const colors = { log: 'text-ink', info: 'text-accent', warn: 'text-warning', error: 'text-danger' } as const;

export function ConsolePanel({ logs, onClear }: { logs: LogLine[]; onClear: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-1">
        <span className="text-xs uppercase tracking-wide text-ink-muted">Console</span>
        <Button size="sm" variant="ghost" onClick={onClear} disabled={logs.length === 0}>Clear</Button>
      </div>
      <div className="flex-1 overflow-auto p-2 font-mono text-xs">
        {logs.length === 0 && <p className="text-ink-muted">console output from your code shows up here</p>}
        {logs.map((l) => <pre key={l.id} className={`whitespace-pre-wrap ${colors[l.level]}`}>{l.text}</pre>)}
      </div>
    </div>
  );
}
