import type { Check } from '../../../types';

type Params = Record<string, string>;
type Env = Record<string, string>;
type Ctx = { waitUntil(promise: Promise<unknown>): void };
type RouteHandler = (request: Request, params: Params, env: Env, ctx: Ctx) => Promise<Response> | Response;
type Route = { method: string; path: string; handler: RouteHandler };
type Logger = (entry: { method: string; path: string; status: number; error?: unknown }) => Promise<void>;
type FetchHandler = (request: Request, env: Env, ctx: Ctx) => Promise<Response>;
type NodeRequest = { method: string; url: string; headers: Record<string, string>; body?: string };
type NodeResponse = { statusCode: number; setHeader(name: string, value: string): void; end(chunk?: string): void };

type Mod = {
  json: (data: unknown, init?: ResponseInit) => Response;
  createApp: (routes: Route[], options?: { logger?: Logger }) => FetchHandler;
  toNodeHandler: (app: FetchHandler, env?: Env) => (req: NodeRequest, res: NodeResponse) => Promise<void>;
};

function makeCtx() {
  const pending: Promise<unknown>[] = [];
  const ctx: Ctx = { waitUntil: (p) => pending.push(p) };
  return { ctx, pending };
}

export const checks: Check[] = [
  {
    name: 'matches a param route and passes params to the handler',
    run: async ({ mod, expect }) => {
      const { createApp, json } = mod as unknown as Mod;
      const app = createApp([
        { method: 'GET', path: '/users/:id', handler: (_req, params) => json({ id: params.id }) },
      ]);
      const { ctx } = makeCtx();
      const res = await app(new Request('http://example.com/users/42'), {}, ctx);
      expect(res.status).to.equal(200);
      expect(await res.json()).to.deep.equal({ id: '42' });
    },
  },
  {
    name: 'responds 404 when no route path matches',
    run: async ({ mod, expect }) => {
      const { createApp, json } = mod as unknown as Mod;
      const app = createApp([{ method: 'GET', path: '/users/:id', handler: (_r, p) => json({ id: p.id }) }]);
      const { ctx } = makeCtx();
      const res = await app(new Request('http://example.com/posts/1'), {}, ctx);
      expect(res.status).to.equal(404);
      const body = await res.json();
      expect(body).to.have.property('error');
    },
  },
  {
    name: 'responds 405 with a sorted, de-duplicated Allow header when the path matches but the method does not',
    run: async ({ mod, expect }) => {
      const { createApp, json } = mod as unknown as Mod;
      const app = createApp([
        { method: 'POST', path: '/users/:id', handler: () => json({ ok: true }) },
        { method: 'GET', path: '/users/:id', handler: () => json({ ok: true }) },
      ]);
      const { ctx } = makeCtx();
      const res = await app(new Request('http://example.com/users/7', { method: 'DELETE' }), {}, ctx);
      expect(res.status).to.equal(405);
      expect(res.headers.get('Allow')).to.equal('GET, POST');
    },
  },
  {
    name: 'error boundary returns 500 with a JSON body and the response resolves before the logger settles',
    run: async ({ mod, expect }) => {
      const { createApp } = mod as unknown as Mod;
      let resolveDeferred!: () => void;
      let loggerSettled = false;
      const deferred = new Promise<void>((resolve) => {
        resolveDeferred = resolve;
      });
      const logger = async () => {
        await deferred;
        loggerSettled = true;
      };
      const app = createApp(
        [{ method: 'GET', path: '/boom', handler: () => { throw new Error('kaboom'); } }],
        { logger },
      );
      const { ctx, pending } = makeCtx();
      const res = await app(new Request('http://example.com/boom'), {}, ctx);
      expect(res.status).to.equal(500);
      const body = await res.json();
      expect(body.error).to.equal('kaboom');
      expect(loggerSettled, 'logger must not have settled yet').to.equal(false);
      resolveDeferred();
      await Promise.all(pending);
      expect(loggerSettled, 'logger should settle once its own promise resolves').to.equal(true);
    },
  },
  {
    name: 'toNodeHandler builds an absolute URL from the host header and copies status/headers/body back',
    run: async ({ mod, expect }) => {
      const { createApp, json, toNodeHandler } = mod as unknown as Mod;
      const app = createApp([
        {
          method: 'GET',
          path: '/echo',
          handler: (request) => json({ url: request.url }),
        },
        {
          method: 'POST',
          path: '/echo',
          handler: async (request) => json({ body: await request.text() }),
        },
      ]);
      const nodeHandler = toNodeHandler(app);

      const headers: Record<string, string> = {};
      let ended = '';
      let statusCode = 0;
      const res: NodeResponse = {
        statusCode: 0,
        setHeader: (name, value) => {
          headers[name.toLowerCase()] = value;
        },
        end: (chunk) => {
          ended = chunk ?? '';
          statusCode = res.statusCode;
        },
      };
      await nodeHandler({ method: 'GET', url: '/echo?x=1', headers: { host: 'api.example.com' } }, res);
      expect(statusCode).to.equal(200);
      expect(headers['content-type']).to.include('application/json');
      expect(JSON.parse(ended)).to.deep.equal({ url: 'http://api.example.com/echo?x=1' });

      const res2: NodeResponse = {
        statusCode: 0,
        setHeader: () => {},
        end: (chunk) => {
          ended = chunk ?? '';
        },
      };
      await nodeHandler(
        { method: 'POST', url: '/echo', headers: { host: 'api.example.com' }, body: 'hello' },
        res2,
      );
      expect(JSON.parse(ended)).to.deep.equal({ body: 'hello' });
    },
  },
];
