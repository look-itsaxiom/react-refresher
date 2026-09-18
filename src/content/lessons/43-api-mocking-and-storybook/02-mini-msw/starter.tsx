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

// TODO: match request.method + the request URL's pathname against each handler's pathPattern
// (":id" params, a trailing "*" wildcard matching any number of remaining segments), trying
// runtime handlers (added via use()) before the initial list, in order. Call the first matching
// resolver; if it returns undefined, keep looking for the next match instead of stopping. A
// `once` handler is removed after it PRODUCES a response (not after a passthrough). resetHandlers()
// must restore the initial handlers to a fresh, unconsumed state. Honor onUnhandledRequest.
export function setupMock(initialHandlers: RequestHandler[], options: MockOptions = {}): MockServer {
  return {
    async handle() {
      return undefined;
    },
    use() {
      // TODO
    },
    resetHandlers() {
      // TODO
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
