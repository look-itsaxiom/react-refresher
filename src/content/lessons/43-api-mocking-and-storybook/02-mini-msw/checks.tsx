import { waitFor } from '@testing-library/dom';
import type { Check } from '../../../types';

type ResolverInfo = { request: Request; params: Record<string, string> };
type Resolver = (info: ResolverInfo) => Response | undefined | Promise<Response | undefined>;
type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
type RequestHandler = { method: Method; pathPattern: string; resolver: Resolver; once?: boolean };
type MockOptions = { onUnhandledRequest?: 'error' | 'bypass' };
type MockServer = {
  handle: (request: Request) => Promise<Response | undefined>;
  use: (...handlers: RequestHandler[]) => void;
  resetHandlers: () => void;
};
type Mod = {
  http: {
    get(path: string, resolver: Resolver, options?: { once?: boolean }): RequestHandler;
    post(path: string, resolver: Resolver, options?: { once?: boolean }): RequestHandler;
    put(path: string, resolver: Resolver, options?: { once?: boolean }): RequestHandler;
    delete(path: string, resolver: Resolver, options?: { once?: boolean }): RequestHandler;
  };
  json: (body: unknown, init?: ResponseInit) => Response;
  setupMock: (handlers: RequestHandler[], options?: MockOptions) => MockServer;
};

export const checks: Check[] = [
  {
    name: 'matches by method and static path, and parses :id-style params into the resolver',
    run: async ({ mod, expect }) => {
      const { http, json, setupMock } = mod as unknown as Mod;
      const mock = setupMock([http.get('/api/users/:id', ({ params }) => json({ id: params.id }))]);

      const response = await mock.handle(new Request('https://x.test/api/users/42?verbose=1'));
      expect(response, 'a matching GET request should get a response').to.exist;
      expect(await response!.json()).to.deep.equal({ id: '42' });

      const wrongMethod = await mock.handle(new Request('https://x.test/api/users/42', { method: 'POST' }));
      expect(wrongMethod, 'the same path with a different method should not match').to.be.undefined;
    },
  },
  {
    name: 'earlier handlers run first; passthrough() falls through to the next match; unhandled requests honor onUnhandledRequest',
    run: async ({ mod, expect }) => {
      const { http, json, setupMock } = mod as unknown as Mod;
      const order: string[] = [];
      const bypassMock = setupMock([
        http.get('/api/*', () => {
          order.push('wildcard');
          return undefined; // passthrough: let a later handler take this request
        }),
        http.get('/api/ping', () => {
          order.push('ping');
          return json({ ok: true });
        }),
      ]);

      const response = await bypassMock.handle(new Request('https://x.test/api/ping'));
      expect(order, 'the wildcard handler should run before falling through to the specific one').to.deep.equal([
        'wildcard',
        'ping',
      ]);
      expect(await response!.json()).to.deep.equal({ ok: true });

      const unmatched = await bypassMock.handle(new Request('https://x.test/other'));
      expect(unmatched, 'no handler matches at all, and the default is to resolve undefined').to.be.undefined;

      const strictMock = setupMock([], { onUnhandledRequest: 'error' });
      let threw = false;
      try {
        await strictMock.handle(new Request('https://x.test/nope'));
      } catch {
        threw = true;
      }
      expect(threw, "onUnhandledRequest: 'error' should throw instead of resolving undefined").to.be.true;
    },
  },
  {
    name: 'once handlers are consumed after responding; use() overrides win; resetHandlers() restores a fresh, unconsumed state',
    run: async ({ mod, expect }) => {
      const { http, json, setupMock } = mod as unknown as Mod;
      let hits = 0;
      const mock = setupMock([
        http.get('/api/flag', () => {
          hits += 1;
          return json({ hits });
        }, { once: true }),
      ]);

      const first = await mock.handle(new Request('https://x.test/api/flag'));
      expect(await first!.json()).to.deep.equal({ hits: 1 });

      const second = await mock.handle(new Request('https://x.test/api/flag'));
      expect(second, 'the once handler should be gone after it already responded once').to.be.undefined;

      mock.use(http.get('/api/flag', () => json({ overridden: true })));
      const third = await mock.handle(new Request('https://x.test/api/flag'));
      expect(await third!.json()).to.deep.equal({ overridden: true });

      mock.resetHandlers();
      const fourth = await mock.handle(new Request('https://x.test/api/flag'));
      expect(
        await fourth!.json(),
        'resetHandlers() should drop the use() override and restore the once handler so it can fire again',
      ).to.deep.equal({ hits: 2 });
    },
  },
  {
    name: 'the app fetches through the mock and renders the mocked response',
    run: async (ctx) => {
      const { render, screen, user, Component, expect } = ctx;
      render(<Component />);
      await user.click(screen.getByRole('button', { name: /fetch user 7/i }));
      await waitFor(() => {
        expect(screen.getByTestId('result').textContent).to.include('Ada Lovelace');
      });
    },
  },
];
