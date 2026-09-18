import { useState } from 'react';

export type ResolverInfo = { request: Request; params: Record<string, string> };
export type Resolver = (info: ResolverInfo) => Response | undefined | Promise<Response | undefined>;
export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
export type RequestHandler = { method: Method; pathPattern: string; resolver: Resolver; once?: boolean };
export type HandlerOptions = { once?: boolean };

function createHandler(method: Method) {
  return (pathPattern: string, resolver: Resolver, options?: HandlerOptions): RequestHandler => ({
    method,
    pathPattern,
    resolver,
    once: options?.once,
  });
}

export const http = {
  get: createHandler('GET'),
  post: createHandler('POST'),
  put: createHandler('PUT'),
  delete: createHandler('DELETE'),
};

/** A stand-in for HttpResponse.json. Don't change this. */
export function json(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
}

export type MockOptions = { onUnhandledRequest?: 'error' | 'bypass' };
export type MockServer = {
  handle: (request: Request) => Promise<Response | undefined>;
  use: (...handlers: RequestHandler[]) => void;
  resetHandlers: () => void;
};

function matchPath(pathPattern: string, pathname: string): Record<string, string> | undefined {
  const patternSegments = pathPattern.split('/').filter(Boolean);
  const pathSegments = pathname.split('/').filter(Boolean);
  const params: Record<string, string> = {};

  for (let i = 0; i < patternSegments.length; i++) {
    const segment = patternSegments[i]!;
    if (segment === '*') return params; // matches every remaining path segment, however many
    if (i >= pathSegments.length) return undefined;
    const pathSegment = pathSegments[i]!;
    if (segment.startsWith(':')) params[segment.slice(1)] = pathSegment;
    else if (segment !== pathSegment) return undefined;
  }
  return patternSegments.length === pathSegments.length ? params : undefined;
}

export function setupMock(initialHandlers: RequestHandler[], options: MockOptions = {}): MockServer {
  const cloneInitial = () => initialHandlers.map((handler) => ({ ...handler }));
  let runtimeHandlers: RequestHandler[] = [];
  let baseHandlers: RequestHandler[] = cloneInitial();

  async function tryList(list: RequestHandler[], request: Request, url: URL): Promise<Response | undefined> {
    for (const handler of list) {
      if (handler.method !== request.method) continue;
      const params = matchPath(handler.pathPattern, url.pathname);
      if (!params) continue;

      const result = await handler.resolver({ request, params });
      if (result === undefined) continue; // an explicit passthrough: keep looking for another match

      if (handler.once) {
        const index = list.indexOf(handler);
        if (index !== -1) list.splice(index, 1);
      }
      return result;
    }
    return undefined;
  }

  return {
    async handle(request) {
      const url = new URL(request.url);
      const fromRuntime = await tryList(runtimeHandlers, request, url);
      if (fromRuntime) return fromRuntime;
      const fromBase = await tryList(baseHandlers, request, url);
      if (fromBase) return fromBase;

      if (options.onUnhandledRequest === 'error') {
        throw new Error(`Unhandled request: ${request.method} ${url.pathname}`);
      }
      return undefined;
    },
    use(...handlers) {
      runtimeHandlers = [...handlers, ...runtimeHandlers];
    },
    resetHandlers() {
      runtimeHandlers = [];
      baseHandlers = cloneInitial();
    },
  };
}

export default function App() {
  const [result, setResult] = useState('idle');
  const [mock] = useState(() =>
    setupMock([http.get('/api/users/:id', ({ params }) => json({ id: Number(params.id), name: 'Ada Lovelace' }))]),
  );

  async function run() {
    const response = await mock.handle(new Request('https://sandbox.local/api/users/7'));
    setResult(response ? await response.text() : 'unhandled');
  }

  return (
    <div style={{ padding: 16 }}>
      <button onClick={run}>Fetch user 7</button>
      <p data-testid="result">{result}</p>
    </div>
  );
}
