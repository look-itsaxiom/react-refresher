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
  // TODO: JSON.stringify(data), content-type application/json, respect init.status/headers
  return new Response(null, { status: 501 });
}

function matchPath(pattern: string, pathname: string): Params | null {
  // TODO: split both on '/', compare segment counts, capture ':name' segments as params
  return null;
}

export function createApp(routes: Route[], options?: { logger?: Logger }): FetchHandler {
  return async (request, env, ctx) => {
    // TODO: implement matching, 404, 405 + Allow header, error boundary + ctx.waitUntil(logger(...))
    return json({ error: 'not implemented' }, { status: 500 });
  };
}

export function toNodeHandler(app: FetchHandler, env: Env = {}) {
  return async (req: NodeRequest, res: NodeResponse) => {
    // TODO: build a Request from req, call app, copy the Response back onto res
    res.statusCode = 501;
    res.end();
  };
}

export default function App() {
  return <p>Portable handler starter</p>;
}
