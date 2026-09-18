import { useEffect, useState } from 'react';

type Status = 'queued' | 'running' | 'failed' | 'done';

const STATUS_COLOR: Record<Status, string> = {
  queued: '#9ca3af',
  running: '#2563eb',
  failed: '#dc2626',
  done: '#16a34a',
};

const STATUS_LABEL: Record<Status, string> = {
  queued: 'Queued',
  running: 'Running',
  failed: 'Failed',
  done: 'Done',
};

const JOBS: Array<{ id: string; name: string; status: Status }> = [
  { id: 'j1', name: 'Build assets', status: 'done' },
  { id: 'j2', name: 'Run test suite', status: 'failed' },
  { id: 'j3', name: 'Deploy preview', status: 'running' },
  { id: 'j4', name: 'Publish report', status: 'queued' },
];

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
          {job.name} — <strong>{STATUS_LABEL[job.status]}</strong>
        </li>
      ))}
    </ul>
  );
}

type MatchMediaFn = (query: string) => MediaQueryList;

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function useReducedMotion(matchMedia?: MatchMediaFn): boolean {
  const resolvedMatchMedia = matchMedia ?? (typeof window !== 'undefined' ? window.matchMedia : undefined);

  const [reduced, setReduced] = useState<boolean>(() => {
    if (!resolvedMatchMedia) return false;
    try {
      return resolvedMatchMedia(REDUCED_MOTION_QUERY).matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!resolvedMatchMedia) return;
    const mql = resolvedMatchMedia(REDUCED_MOTION_QUERY);
    const handleChange = () => setReduced(mql.matches);
    handleChange();
    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedMatchMedia]);

  return reduced;
}

export function Announcement({
  message,
  matchMedia,
}: {
  message: string;
  matchMedia?: MatchMediaFn;
}) {
  const reducedMotion = useReducedMotion(matchMedia);
  return (
    <div
      role="status"
      data-motion={reducedMotion ? 'reduced' : 'full'}
      className={reducedMotion ? 'announcement-fade-in' : 'announcement-slide-in'}
    >
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
