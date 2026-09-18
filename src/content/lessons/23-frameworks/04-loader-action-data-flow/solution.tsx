import { useEffect, useState } from 'react';

/** A deterministic stand-in for real async timing. Loaders record events on it instead
 * of doing real network I/O, so call order is observable without waiting on real timers. */
export type Clock = {
  log: string[];
  record: (event: string) => void;
  tick: () => Promise<void>;
};

export function createClock(): Clock {
  const log: string[] = [];
  return {
    log,
    record: (event) => {
      log.push(event);
    },
    tick: () => Promise.resolve().then(() => undefined),
  };
}

type LoaderFn = (clock: Clock) => Promise<unknown>;
type ActionFn = (clock: Clock) => Promise<unknown>;

export function makeLoader(id: string, opts: { fail?: boolean } = {}): LoaderFn {
  let calls = 0;
  return async (clock: Clock) => {
    calls += 1;
    clock.record(`${id}:start`);
    await clock.tick();
    if (opts.fail) {
      clock.record(`${id}:error`);
      throw new Error(`${id} loader failed`);
    }
    clock.record(`${id}:end`);
    return { id, calls };
  };
}

export function makeAction(id: string): ActionFn {
  return async (clock: Clock) => {
    clock.record(`${id}:action`);
    await clock.tick();
    return { id, submitted: true };
  };
}

export type RouteNode = {
  id: string;
  /** a static segment, or ':param' for a dynamic segment; the root node uses '' */
  path: string;
  loader?: LoaderFn;
  action?: ActionFn;
  children?: RouteNode[];
};

/** Given: returns the matched chain root-to-leaf, or null if nothing matches. */
export function matchChain(tree: RouteNode, url: string): RouteNode[] | null {
  const segments = url.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  const chain: RouteNode[] = [tree];
  let node = tree;
  for (const seg of segments) {
    const child = (node.children ?? []).find((c) => c.path === seg || c.path.startsWith(':'));
    if (!child) return null;
    chain.push(child);
    node = child;
  }
  return chain;
}

export type NavigationResult =
  | { ok: true; loaderData: Record<string, unknown> }
  | { ok: false; errorRouteId: string; loaderData: Record<string, unknown> };

export async function runNavigation(tree: RouteNode, url: string, clock: Clock): Promise<NavigationResult> {
  const chain = matchChain(tree, url);
  if (!chain) return { ok: false, errorRouteId: tree.id, loaderData: {} };

  const withLoaders = chain.filter((node): node is RouteNode & { loader: LoaderFn } => Boolean(node.loader));
  const settled = await Promise.allSettled(
    withLoaders.map((node) => node.loader(clock).then((data) => ({ id: node.id, data }))),
  );

  const loaderData: Record<string, unknown> = {};
  let errorRouteId: string | undefined;
  for (let i = 0; i < settled.length; i++) {
    const outcome = settled[i]!;
    const node = withLoaders[i]!;
    if (outcome.status === 'fulfilled') {
      loaderData[node.id] = outcome.value.data;
    } else if (!errorRouteId) {
      errorRouteId = node.id;
    }
  }

  if (errorRouteId) return { ok: false, errorRouteId, loaderData };
  return { ok: true, loaderData };
}

/** Given: runs the named route's action, then revalidates by re-running runNavigation. */
export async function runAction(
  tree: RouteNode,
  url: string,
  actionRouteId: string,
  clock: Clock,
): Promise<NavigationResult & { actionData?: unknown }> {
  const chain = matchChain(tree, url);
  const actionNode = chain?.find((n) => n.id === actionRouteId);
  const actionData = actionNode?.action ? await actionNode.action(clock) : undefined;
  const navigation = await runNavigation(tree, url, clock);
  return { ...navigation, actionData };
}

const demoTree: RouteNode = {
  id: 'root',
  path: '',
  loader: makeLoader('root'),
  children: [
    {
      id: 'shop',
      path: 'shop',
      loader: makeLoader('shop'),
      action: makeAction('shop'),
      children: [{ id: 'product', path: ':id', loader: makeLoader('product') }],
    },
  ],
};

export default function App() {
  const [result, setResult] = useState<NavigationResult | null>(null);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    const clock = createClock();
    runNavigation(demoTree, '/shop/42', clock).then((res) => {
      setResult(res);
      setLog([...clock.log]);
    });
  }, []);

  return (
    <div style={{ padding: 16, fontFamily: 'monospace' }}>
      <h2>Navigation to /shop/42</h2>
      <pre>{result ? JSON.stringify(result, null, 2) : 'loading…'}</pre>
      <h3>Clock log (call order)</h3>
      <pre>{log.join('\n')}</pre>
    </div>
  );
}
