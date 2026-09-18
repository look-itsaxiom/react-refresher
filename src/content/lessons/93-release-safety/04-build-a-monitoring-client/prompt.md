# Build a mini error-monitoring client

Implement a small error-monitoring client in `App.tsx` — the same shape as Sentry's
`init`/`captureException`/breadcrumbs, scaled down to something you can unit test without
a network.

## `createMonitor`

```ts
type BreadcrumbLevel = 'debug' | 'info' | 'warning' | 'error';
type Breadcrumb = { category: string; message: string; level: BreadcrumbLevel; timestamp: number };
type Mechanism = 'manual' | 'react-boundary' | 'react-uncaught' | 'react-recoverable';
type MonitorEvent = {
  name: string;
  message: string;
  stack?: string;
  release: string;
  mechanism: Mechanism;
  breadcrumbs: Breadcrumb[];
  extra?: Record<string, unknown>;
};

function createMonitor(config: {
  release: string;
  sampleRate: number; // 0..1
  transport: (event: MonitorEvent) => void;
  beforeSend?: (event: MonitorEvent) => MonitorEvent | null;
  maxBreadcrumbs?: number; // default 20
  random?: () => number; // default Math.random; inject for deterministic tests
  dedupeWindowMs?: number; // default 5000
}): {
  addBreadcrumb: (b: { category: string; message: string; level: BreadcrumbLevel }) => void;
  captureException: (error: Error, context?: Record<string, unknown>, mechanism?: Mechanism) => void;
  scrub: (event: MonitorEvent) => MonitorEvent;
  installReactRootHandlers: () => {
    onCaughtError: (error: unknown, errorInfo: unknown) => void;
    onUncaughtError: (error: unknown, errorInfo: unknown) => void;
    onRecoverableError: (error: unknown, errorInfo: unknown) => void;
  };
  flush: () => void;
};
```

Behavior, precisely:

- **`addBreadcrumb`** pushes onto a ring buffer capped at `maxBreadcrumbs`: once full, the
  *oldest* breadcrumb is dropped to make room for the new one, so the buffer always holds
  the most recent `maxBreadcrumbs` entries in chronological order.
- **`scrub(event)`** returns a deep copy of `event` with `extra` sanitized, recursively:
  - Any object key (at any depth) matching `password`, `token`, `secret`, or
    `authorization` (case-insensitive, exact key match) has its entire value replaced with
    the string `'[redacted]'`, regardless of that value's type or shape.
  - Any *string* value anywhere in `extra` (not just under those keys) has email addresses
    replaced with `'[redacted]'`, and any `Bearer <token>` substring replaced with
    `'Bearer [redacted]'`.
  - `scrub` is exported and callable on its own, independent of `captureException`.
- **`captureException(error, context, mechanism = 'manual')`**:
  1. Builds a dedupe key from `error.name`, `error.message`, and `error.stack`. If an
     event with the same key was captured less than `dedupeWindowMs` ago, drop this call
     entirely — `transport` and `beforeSend` are not called, and the dedupe clock for that
     key does **not** reset.
  2. Otherwise, decides whether to sample this event in: call the injected `random()` and
     include the event only if the result is strictly less than `sampleRate`. A dropped
     (unsampled) call still updates the dedupe clock (it happened), but never reaches
     `transport`.
  3. Builds a `MonitorEvent` from `release`, `mechanism`, a **snapshot** of the current
     breadcrumbs (not a live reference — later breadcrumbs must not retroactively appear
     on an already-captured event), and `context` as `extra`.
  4. Runs the event through `scrub`, then through `beforeSend` if provided. If
     `beforeSend` returns `null`, drop the event — do not call `transport`.
  5. Otherwise calls `transport(event)` with the final event.
- **`installReactRootHandlers()`** returns an object of the three React 19 root callbacks
  (`onCaughtError`, `onUncaughtError`, `onRecoverableError`), suitable for passing directly
  as `createRoot(container, options)`'s second argument. Each one calls `captureException`
  with the matching `mechanism` (`'react-boundary'`, `'react-uncaught'`,
  `'react-recoverable'` respectively). React's `errorInfo` argument can carry
  non-serializable internals (on `onCaughtError` it includes a reference to the boundary
  instance itself) — pull out only `errorInfo.componentStack` (a string) and pass
  `{ componentStack }` as the context, not the raw `errorInfo` object.
- **`flush()`** exists for API symmetry with real SDKs (a real client would await any
  in-flight sends); this implementation's `transport` calls are synchronous, so `flush` can
  be a no-op.

Export `createMonitor` from `App.tsx`. Render a small default `App` that creates a monitor
(any reasonable config) so the preview shows something — the checks only exercise the
exported function directly.
