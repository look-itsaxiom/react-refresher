import { useState } from 'react';

// TODO: this stub is intentionally wide so the file compiles. Replace it with a real
// template-literal type that extracts `{ id: string; postId: string }` from a path like
// '/users/:id/posts/:postId' — see the "Types as a programming language" step.
type ExtractParams<Path extends string> = Record<string, string>;

// Checked with a `never` parameter on purpose: contravariance makes `(params: never) => void`
// assignable-to for a handler of ANY specific parameter shape, so this shape check accepts
// every route regardless of what its own params type turns out to be.
type AnyRouteDef = { path: string; handler: (params: never) => void };

type RouteDef<Path extends string> = { path: Path; handler: (params: ExtractParams<Path>) => void };

function route<Path extends string>(
  path: Path,
  handler: (params: ExtractParams<Path>) => void,
): RouteDef<Path> {
  return { path, handler };
}

type ParamsOf<R> = R extends { handler: (params: infer Params) => void } ? Params : never;

type MatchResult<Routes extends readonly AnyRouteDef[]> =
  | {
      [I in keyof Routes]: Routes[I] extends { path: infer P extends string }
        ? { path: P; params: ParamsOf<Routes[I]> }
        : never;
    }[number]
  | null;

function matchPath(pattern: string, url: string): Record<string, string> | null {
  const patternParts = pattern.split('/').filter(Boolean);
  const urlParts = url.split('/').filter(Boolean);
  if (patternParts.length !== urlParts.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    const part = patternParts[i];
    const segment = urlParts[i];
    if (part === undefined || segment === undefined) return null;

    // TODO: if `part` is a `:name` placeholder, capture `segment` into `params` under
    // `name`. Otherwise `part` must match `segment` literally, or this route doesn't match.
  }
  return params;
}

function createRouter<const Routes extends readonly AnyRouteDef[]>(routes: Routes) {
  function match(url: string): MatchResult<Routes> {
    for (const r of routes) {
      const params = matchPath(r.path, url);
      if (params) return { path: r.path, params } as MatchResult<Routes>;
    }
    return null as MatchResult<Routes>;
  }
  return { match };
}

const routeTable = [
  route('/users/:id', (params) => params.id),
  route('/users/:id/posts/:postId', (params) => `${params.id}/${params.postId}`),
] as const satisfies readonly AnyRouteDef[];

const router = createRouter(routeTable);

export default function App() {
  const [url, setUrl] = useState('/users/42');
  const result = router.match(url);
  return (
    <main>
      <label htmlFor="url">URL</label>
      <input id="url" value={url} onChange={(event) => setUrl(event.target.value)} />
      <p data-testid="result">
        {result ? `${result.path} params=${JSON.stringify(result.params)}` : 'no match'}
      </p>
    </main>
  );
}

export { createRouter, route, matchPath };
export type { ExtractParams, RouteDef, MatchResult };
