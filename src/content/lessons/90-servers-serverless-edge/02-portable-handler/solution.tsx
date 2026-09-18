export type Params = Record<string, string>;
export type Env = Record<string, string>;
export type Ctx = { waitUntil(promise: Promise<unknown>): void };
export type RouteHandler = (request: Request, params: Params, env: Env, ctx: Ctx) => Promise<Response> | Response;
export type Route = { method: string; path: string; handler: RouteHandler };
export type LogEntry = { method: string; path: string; status: number; error?: unknown };
export type Logger = (entry: LogEntry) => Promise<void>;
export type FetchHandler = (request: Request, env: Env, ctx: Ctx) => Promise<Response>;

export type NodeRequest = { method: string; url: string; headers: Record<string, string>; body?: string };
export type NodeResponse = {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(chunk?: string): void;
};

export function json(data: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  if (!headers.has('content-type')) headers.set('content-type', 'application/json');
  return new Response(JSON.stringify(data), { ...init, headers, status: init?.status ?? 200 });
}

function matchPath(pattern: string, pathname: string): Params | null {
  const patternSegments = pattern.split('/').filter(Boolean);
  const pathSegments = pathname.split('/').filter(Boolean);
  if (patternSegments.length !== pathSegments.length) return null;
  const params: Params = {};
  for (let i = 0; i < patternSegments.length; i++) {
    const p = patternSegments[i]!;
    const s = pathSegments[i]!;
    if (p.startsWith(':')) {
      params[p.slice(1)] = s;
    } else if (p !== s) {
      return null;
    }
  }
  return params;
}

export function createApp(routes: Route[], options?: { logger?: Logger }): FetchHandler {
  const logger: Logger = options?.logger ?? (async () => {});

  return async (request, env, ctx) => {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    const pathMatches: Array<{ route: Route; params: Params }> = [];
    for (const route of routes) {
      const params = matchPath(route.path, url.pathname);
      if (params) pathMatches.push({ route, params });
    }

    if (pathMatches.length === 0) {
      return json({ error: 'not found' }, { status: 404 });
    }

    const methodMatch = pathMatches.find(({ route }) => route.method.toUpperCase() === method);
    if (!methodMatch) {
      const allowed = Array.from(new Set(pathMatches.map(({ route }) => route.method.toUpperCase()))).sort();
      return json({ error: 'method not allowed' }, { status: 405, headers: { Allow: allowed.join(', ') } });
    }

    try {
      return await methodMatch.route.handler(request, methodMatch.params, env, ctx);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.waitUntil(logger({ method, path: url.pathname, status: 500, error }));
      return json({ error: message }, { status: 500 });
    }
  };
}

export function toNodeHandler(app: FetchHandler, env: Env = {}) {
  return async (req: NodeRequest, res: NodeResponse) => {
    const host = req.headers.host ?? 'localhost';
    const includeBody = req.method !== 'GET' && req.method !== 'HEAD';
    const request = new Request(`http://${host}${req.url}`, {
      method: req.method,
      headers: req.headers,
      body: includeBody ? req.body : undefined,
    });

    const pending: Promise<unknown>[] = [];
    const ctx: Ctx = { waitUntil: (p) => pending.push(p) };

    const response = await app(request, env, ctx);
    await Promise.all(pending);

    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.end(await response.text());
  };
}

export default function App() {
  return <p>Portable handler ready</p>;
}
