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

type Tagged =
  | { __t: 'date'; v: string }
  | { __t: 'map'; v: [unknown, unknown][] }
  | { __t: 'set'; v: unknown[] }
  | { __t: 'undefined' }
  | { __t: 'bigint'; v: string };

function isTagged(val: unknown): val is Tagged {
  return typeof val === 'object' && val !== null && '__t' in val;
}

/**
 * Recursively replaces rich values with plain, JSON-safe tagged objects.
 * This has to run as a separate pass BEFORE `JSON.stringify`, not as its
 * replacer function -- `JSON.stringify` calls `value.toJSON()` (which
 * `Date` defines) before the replacer ever runs, so a replacer never
 * actually sees a `Date` instance, only the string it already turned into.
 */
function tag(val: unknown): unknown {
  if (val instanceof Date) return { __t: 'date', v: val.toISOString() } satisfies Tagged;
  if (val instanceof Map) return { __t: 'map', v: Array.from(val.entries()).map(([k, v]) => [tag(k), tag(v)]) } satisfies Tagged;
  if (val instanceof Set) return { __t: 'set', v: Array.from(val.values()).map((v) => tag(v)) } satisfies Tagged;
  if (typeof val === 'bigint') return { __t: 'bigint', v: val.toString() } satisfies Tagged;
  if (val === undefined) return { __t: 'undefined' } satisfies Tagged;
  if (Array.isArray(val)) return val.map((v) => tag(v));
  if (val !== null && typeof val === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val)) out[k] = tag(v);
    return out;
  }
  return val;
}

function reviver(_key: string, val: unknown): unknown {
  if (isTagged(val)) {
    switch (val.__t) {
      case 'date':
        return new Date(val.v);
      case 'map':
        return new Map(val.v);
      case 'set':
        return new Set(val.v);
      case 'undefined':
        return undefined;
      case 'bigint':
        return BigInt(val.v);
    }
  }
  return val;
}

const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);
const BACKSLASH = String.fromCharCode(0x5c);

/** Characters that can break out of a <script> tag or a JS string literal. */
function escapeForInlineScript(json: string): string {
  return json
    .split('<').join(BACKSLASH + 'u003C')
    .split('>').join(BACKSLASH + 'u003E')
    .split('&').join(BACKSLASH + 'u0026')
    .split(LINE_SEPARATOR).join(BACKSLASH + 'u2028')
    .split(PARAGRAPH_SEPARATOR).join(BACKSLASH + 'u2029');
}

export function serializeState(value: unknown): string {
  const json = JSON.stringify(tag({ __root: value }));
  return escapeForInlineScript(json);
}

export function deserializeState(text: string): unknown {
  const parsed = JSON.parse(text, reviver) as { __root?: unknown };
  return parsed.__root;
}

export function renderWithState<S>(Component: ComponentType<{ state: S }>, state: S): string {
  const html = renderToString(createElement(Component, { state }));
  const payload = serializeState(state);
  return `<div id="app-root">${html}</div><script type="application/json" id="app-state">${payload}</script>`;
}

export function bootFromDocument<S>(
  container: Element,
  Component: ComponentType<{ state: S }>,
  options?: HydrationOptions
): void {
  const el = document.getElementById('app-state');
  const state = deserializeState(el?.textContent ?? '') as S;
  hydrateRoot(container, createElement(Component, { state }), options);
}

export default function App() {
  const state = buildDemoState();
  const html = renderWithState(Widget, state);
  return <pre style={{ whiteSpace: 'pre-wrap' }}>{html}</pre>;
}
