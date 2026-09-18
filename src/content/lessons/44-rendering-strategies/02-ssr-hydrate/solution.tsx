import { useEffect, useRef, useState, type ComponentType } from 'react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';

/** Given: the component we'll render on the "server" and hydrate on the "client". Do not change. */
export function Counter({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  return (
    <div>
      <p data-testid="count">{`Count: ${count}`}</p>
      <button onClick={() => setCount((c) => c + 1)}>Increment</button>
    </div>
  );
}

/**
 * Render `App` with `props` to an HTML string, following the shape described
 * in prompt.md: a `<div id="root">` wrapping the rendered markup, followed by
 * a `<script id="__PROPS__">` carrying the serialized props.
 */
export function renderPage(App: ComponentType<any>, props: Record<string, unknown>): string {
  const html = renderToString(<App {...props} />);
  const json = JSON.stringify(props).replace(/</g, '\\u003c');
  return `<div id="root">${html}</div>\n<script id="__PROPS__" type="application/json">${json}</script>`;
}

/**
 * Hydrate a container whose innerHTML was already set to a string that
 * `renderPage` produced. Reads the props back out of `#__PROPS__` and calls
 * `hydrateRoot` on `#root`.
 */
export function hydrate(container: HTMLElement, onRecoverableError?: (error: unknown) => void): void {
  const propsScript = container.querySelector('#__PROPS__');
  const props = propsScript ? JSON.parse(propsScript.textContent ?? '{}') : {};

  const root = container.querySelector('#root');
  if (!root) {
    throw new Error('hydrate: no #root element found — did you set innerHTML to renderPage output first?');
  }

  hydrateRoot(root, <Counter {...props} />, onRecoverableError ? { onRecoverableError } : undefined);
}

export default function App() {
  const html = renderPage(Counter, { initialCount: 5 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = html;
    hydrate(container, () => setErrorCount((n) => n + 1));
  }, [html]);

  return (
    <div>
      <h3>What the server sent</h3>
      <pre data-testid="html-output">{html}</pre>
      <h3>Hydrated, live</h3>
      <div ref={containerRef} data-testid="hydrated-root" />
      <p data-testid="error-count">Recoverable errors: {errorCount}</p>
    </div>
  );
}
