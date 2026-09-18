import { useEffect, useId, useState, useSyncExternalStore } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';

function subscribeToResize(onChange: () => void) {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
}
function getClientWidth() {
  return window.innerWidth > 600;
}
function getServerWidthAssumption() {
  // The server doesn't know the visitor's viewport. Assume desktop; the
  // client corrects this immediately after hydration if it's wrong.
  return true;
}

function Dashboard() {
  // FIX 1: don't read the clock during the render that must match the
  // server. Render nothing for it on the first pass, then fill it in from
  // an effect — an ordinary client-only update, not a hydration mismatch.
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    setTime(new Date().toLocaleTimeString());
  }, []);

  // FIX 2: useId() is derived from the component's position in the tree,
  // which is identical on the server and the client for the same tree
  // shape — no randomness involved.
  const panelId = useId();

  // FIX 3: useSyncExternalStore's getServerSnapshot is used both for the
  // real server render and for the client's first (hydrating) render, so
  // the two always agree. Once hydration commits, React compares that
  // snapshot to the live getSnapshot() and schedules a correction if they
  // differ, then keeps listening via subscribe.
  const wide = useSyncExternalStore(subscribeToResize, getClientWidth, getServerWidthAssumption);

  return (
    <section data-testid="panel" id={panelId}>
      <p data-testid="time">{time ?? ''}</p>
      <p data-testid="layout">{wide ? 'wide' : 'narrow'}</p>
    </section>
  );
}

export function serverHtml(): string {
  return renderToString(<Dashboard />);
}

export function hydrateInto(container: HTMLElement, onRecoverableError?: (error: unknown, errorInfo: unknown) => void): Root {
  return hydrateRoot(container, <Dashboard />, { onRecoverableError });
}

export default Dashboard;
