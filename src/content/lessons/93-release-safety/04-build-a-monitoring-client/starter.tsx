import * as React from 'react';

export type BreadcrumbLevel = 'debug' | 'info' | 'warning' | 'error';
export type Breadcrumb = { category: string; message: string; level: BreadcrumbLevel; timestamp: number };
export type Mechanism = 'manual' | 'react-boundary' | 'react-uncaught' | 'react-recoverable';
export type MonitorEvent = {
  name: string;
  message: string;
  stack?: string;
  release: string;
  mechanism: Mechanism;
  breadcrumbs: Breadcrumb[];
  extra?: Record<string, unknown>;
};

export type MonitorConfig = {
  release: string;
  sampleRate: number;
  transport: (event: MonitorEvent) => void;
  beforeSend?: (event: MonitorEvent) => MonitorEvent | null;
  maxBreadcrumbs?: number;
  random?: () => number;
  dedupeWindowMs?: number;
};

// TODO: recursively redact extra: keys named password|token|secret|authorization (any
// case, exact match) get their whole value replaced; string values anywhere else get
// emails and "Bearer <token>" substrings redacted in place.
export function scrub(event: MonitorEvent): MonitorEvent {
  return event;
}

export function createMonitor(config: MonitorConfig) {
  const maxBreadcrumbs = config.maxBreadcrumbs ?? 20;
  const random = config.random ?? Math.random;
  const dedupeWindowMs = config.dedupeWindowMs ?? 5000;

  let breadcrumbs: Breadcrumb[] = [];

  function addBreadcrumb(b: { category: string; message: string; level: BreadcrumbLevel }) {
    // TODO: push into a ring buffer capped at maxBreadcrumbs, dropping the oldest entry.
    breadcrumbs.push({ ...b, timestamp: Date.now() });
  }

  function captureException(error: Error, context?: Record<string, unknown>, mechanism: Mechanism = 'manual') {
    // TODO:
    // 1. Dedupe on (name, message, stack) within dedupeWindowMs — drop silently, no reset.
    // 2. Sample: only proceed if random() < config.sampleRate.
    // 3. Build a MonitorEvent with a *snapshot* of current breadcrumbs.
    // 4. Run it through scrub(), then beforeSend() if provided (null return drops it).
    // 5. Call config.transport(event).
    const event: MonitorEvent = {
      name: error.name || 'Error',
      message: error.message || '',
      stack: error.stack,
      release: config.release,
      mechanism,
      breadcrumbs: [...breadcrumbs],
      extra: context,
    };
    config.transport(event);
  }

  function installReactRootHandlers() {
    // TODO: wire these to captureException with the matching mechanism tag. Pass only
    // { componentStack: errorInfo.componentStack } as context — errorInfo itself can
    // carry non-serializable internals (e.g. the boundary instance on onCaughtError).
    return {
      onCaughtError(_error: unknown, _errorInfo: unknown) {},
      onUncaughtError(_error: unknown, _errorInfo: unknown) {},
      onRecoverableError(_error: unknown, _errorInfo: unknown) {},
    };
  }

  function flush() {}

  return { addBreadcrumb, captureException, scrub, installReactRootHandlers, flush };
}

const monitor = createMonitor({
  release: 'demo-1.0.0',
  sampleRate: 1,
  transport: (event) => console.log('[monitor]', event),
});

export default function App() {
  const [count, setCount] = React.useState(0);
  return (
    <div>
      <p data-testid="status">monitor ready for release demo-1.0.0</p>
      <button
        onClick={() => {
          monitor.addBreadcrumb({ category: 'ui', message: `clicked (${count})`, level: 'info' });
          setCount((c) => c + 1);
        }}
      >
        click me ({count})
      </button>
    </div>
  );
}
