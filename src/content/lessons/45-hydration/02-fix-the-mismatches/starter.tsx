import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';

function Dashboard() {
  // BUG 1: the server's clock and the browser's clock are never the exact
  // same millisecond, so this text disagrees between the server markup and
  // the client's first render.
  const time = new Date().toLocaleTimeString();

  // BUG 2: Math.random() runs again on the client and produces a different
  // id than the one already baked into the server HTML. Attribute
  // mismatches like this one aren't patched and don't call
  // onRecoverableError — the server's stale id just stays on the page.
  const panelId = `panel-${Math.random().toString(36).slice(2, 8)}`;

  // BUG 3: window.innerWidth reflects whatever this device's viewport is
  // *right now*. A real server has no `window` at all; reading it during
  // render here means the server's guess and the client's real value can
  // disagree by the time hydration runs.
  const wide = window.innerWidth > 600;

  return (
    <section data-testid="panel" id={panelId}>
      <p data-testid="time">{time}</p>
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
