import { useState } from 'react';

// Extracts `{ id: string; postId: string }` from a path like '/users/:id/posts/:postId'.
type ExtractParams<Path extends string> = Path extends `${infer _Start}:${infer Param}/${infer Rest}`
  ? { [K in Param | keyof ExtractParams<Rest>]: string }
  : Path extends `${infer _Start}:${infer Param}`
    ? { [K in Param]: string }
    : Record<string, never>;

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

    if (part.startsWith(':')) {
      params[part.slice(1)] = segment;
    } else if (part !== segment) {
      return null;
    }
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

// --- type-level tests below: the sandbox strips types before running your code, so these
// lines aren't graded there. `pnpm typecheck` (plain `tsc --noEmit`) is what actually judges
// them — that's the real gate this repo runs, and the one this exercise is teaching. ---
type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
  ? true
  : false;

type _paramsOneSegment = Expect<Equal<ExtractParams<'/users/:id'>, { id: string }>>;
type _paramsTwoSegments = Expect<
  Equal<ExtractParams<'/users/:id/posts/:postId'>, { id: string; postId: string }>
>;

const userMatch = router.match('/users/42');
if (userMatch && userMatch.path === '/users/:id') {
  userMatch.params.id; // string — narrowed by the `path` discriminant
  // @ts-expect-error 'postId' only exists on the '/users/:id/posts/:postId' branch of the union
  userMatch.params.postId;
}

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
