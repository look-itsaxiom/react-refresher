import { useState } from 'react';

type Status = 'queued' | 'running' | 'failed' | 'done';

const STATUS_COLOR: Record<Status, string> = {
  queued: '#9ca3af',
  running: '#2563eb',
  failed: '#dc2626',
  done: '#16a34a',
};

const JOBS: Array<{ id: string; name: string; status: Status }> = [
  { id: 'j1', name: 'Build assets', status: 'done' },
  { id: 'j2', name: 'Run test suite', status: 'failed' },
  { id: 'j3', name: 'Deploy preview', status: 'running' },
  { id: 'j4', name: 'Publish report', status: 'queued' },
];

// TODO: each item shows only a colored dot. Add a visible text label for the
// status, and make sure the item's accessible name includes the status word.
export function StatusList() {
  return (
    <ul>
      {JOBS.map((job) => (
        <li key={job.id}>
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: STATUS_COLOR[job.status],
              marginRight: 8,
            }}
          />
          {job.name}
        </li>
      ))}
    </ul>
  );
}

// TODO: write a hook that reports whether the user prefers reduced motion,
// takes an injectable matchMedia-like function, defaults to window.matchMedia,
// falls back to `false` when matchMedia isn't available, and updates when the
// underlying media query's match state changes.
export function useReducedMotion(
  matchMedia: (query: string) => MediaQueryList = window.matchMedia,
): boolean {
  return false;
}

// TODO: gate the slide-in animation on useReducedMotion, and set
// data-motion="reduced" | "full" on the status container so styles (and tests)
// can key off it.
export function Announcement({
  message,
  matchMedia,
}: {
  message: string;
  matchMedia?: (query: string) => MediaQueryList;
}) {
  return (
    <div role="status" className="announcement-slide-in">
      {message}
    </div>
  );
}

export default function App() {
  const [dismissed, setDismissed] = useState(false);
  return (
    <main>
      <h1>Pipeline status</h1>
      <StatusList />
      {!dismissed && (
        <>
          <Announcement message="Deploy preview is ready." />
          <button onClick={() => setDismissed(true)}>Dismiss</button>
        </>
      )}
    </main>
  );
}
