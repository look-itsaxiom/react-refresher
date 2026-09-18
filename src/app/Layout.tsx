import { Link, Outlet } from 'react-router';
import { useSaveState, progressStore } from './progress/useProgress';
import { toggleTheme, useTheme } from './theme';
import { Button } from './components/Button';

function SaveIndicator() {
  const state = useSaveState();
  const label = { idle: '', loading: 'Loading…', saving: 'Saving…', saved: 'Saved', error: 'Save failed' }[state];
  const color = state === 'error' ? 'text-danger' : state === 'saved' ? 'text-success' : 'text-ink-muted';
  return (
    <span className={`text-xs ${color} flex items-center gap-2`} aria-live="polite">
      {label}
      {state === 'error' && (
        <Button size="sm" variant="danger" onClick={() => progressStore.retrySave()}>Retry</Button>
      )}
    </span>
  );
}

export function Layout() {
  const theme = useTheme();
  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-border bg-surface-2">
        <div className="mx-auto max-w-7xl px-4 h-12 flex items-center justify-between">
          <Link to="/" className="font-semibold tracking-tight">
            <span className="text-accent">⚛</span> React Refresher
          </Link>
          <div className="flex items-center gap-4">
            <SaveIndicator />
            <Button size="sm" variant="ghost" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? 'Light' : 'Dark'}
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 min-h-0">
        <Outlet />
      </main>
    </div>
  );
}
