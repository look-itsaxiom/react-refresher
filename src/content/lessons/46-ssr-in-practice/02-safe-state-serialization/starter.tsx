import { createElement, type ComponentType } from 'react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot, type HydrationOptions } from 'react-dom/client';

export type DemoState = {
  name: string;
  bio: string;
  joinedAt: Date;
  tags: Set<string>;
};

export function buildDemoState(bio = 'Loves React.'): DemoState {
  return {
    name: 'Ada',
    bio,
    joinedAt: new Date('2024-01-01T00:00:00.000Z'),
    tags: new Set(['admin', 'beta']),
  };
}

export function Widget({ state }: { state: DemoState }) {
  return (
    <div>
      <p>{state.name}</p>
      <p>{state.bio}</p>
      <p>Joined {state.joinedAt.toISOString().slice(0, 10)}</p>
      <ul>
        {Array.from(state.tags).map((tag) => (
          <li key={tag}>{tag}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * BUG: plain JSON.stringify. Can't represent Date/Map/Set/undefined/bigint,
 * and does nothing to stop the string from breaking out of a <script> tag.
 */
export function serializeState(value: unknown): string {
  return JSON.stringify(value);
}

/** BUG: the naive inverse of the naive serializer above. */
export function deserializeState(text: string): unknown {
  return JSON.parse(text);
}

/**
 * Should render `Component` with `state` to HTML and embed a
 * `<script type="application/json" id="app-state">` containing
 * `serializeState(state)`, inside a `<div id="app-root">` wrapper.
 */
export function renderWithState<S>(Component: ComponentType<{ state: S }>, state: S): string {
  const html = renderToString(createElement(Component, { state }));
  return `<div id="app-root">${html}</div><script id="app-state">${JSON.stringify(state)}</script>`;
}

/**
 * Should read `#app-state`'s text out of `document`, deserialize it, and
 * hydrate `Component` onto `container` with it.
 */
export function bootFromDocument<S>(
  container: Element,
  Component: ComponentType<{ state: S }>,
  options?: HydrationOptions
): void {
  const el = document.getElementById('app-state');
  const state = JSON.parse(el?.textContent ?? 'null') as S;
  hydrateRoot(container, createElement(Component, { state }), options);
}

export default function App() {
  const state = buildDemoState();
  const html = renderWithState(Widget, state);
  return <pre style={{ whiteSpace: 'pre-wrap' }}>{html}</pre>;
}
