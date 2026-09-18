# Mock the network, not the module

`vi.mock('./api')` is the reflex most people bring from Jest: replace the module, control what it
returns, move on. It works, and it also quietly deletes the thing you meant to test. Once `./api`
is a mock, your component's actual `fetch` call — the URL, the method, the headers, the query
string, what happens on a 404 versus a 500 — never runs. You're testing whatever your mock
returns, not whether your code asks for the right thing correctly. Mock Service Worker (MSW,
currently 2.x, this course uses 2.15) intercepts one layer lower: at the network boundary, using
the standard `Request`/`Response` APIs the platform already gives you. Your component still calls
`fetch`, still builds the real URL, still parses a real `Response` — MSW just answers before the
request reaches a wire. The payoff is portability: the same handler functions run in Vitest, in a
real browser during local dev, in Playwright, and inside Storybook, because none of them are
Vitest-specific mocks — they're just functions that take a `Request` and return a `Response`.

## Handlers and resolvers

A handler pairs a method-and-path matcher with a *resolver* — the function that decides how to
respond:

```ts
import { http, HttpResponse, delay } from 'msw';

export const handlers = [
  http.get('/api/users/:id', async ({ params }) => {
    await delay(150); // simulate real latency; omit to resolve instantly
    return HttpResponse.json({ id: Number(params.id), name: 'Ada Lovelace' });
  }),
  http.post('/api/users', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(body, { status: 201 });
  }),
];
```

`HttpResponse.json` is a small convenience over `new Response(JSON.stringify(...), { headers: {
'content-type': 'application/json' } })` — reach for the plain `Response` constructor when you
need a non-JSON body, a specific status with no body, or custom headers MSW doesn't special-case.
`params` come from `:id`-style path segments; a resolver that needs the raw request — to check a
header, read a query string, or read the body — gets it as `request`, a real `Request` instance.

## Where handlers live: `setupServer` vs `setupWorker`

Node-based tests (Vitest, Jest) use `setupServer(...handlers)`, which patches Node's request
dispatch so nothing hits a real socket. Browser contexts — local dev, Storybook, a Playwright test
driving a real page — use `setupWorker(...handlers)`, which registers an actual Service Worker
that intercepts `fetch` at the browser network layer. Same handler array, two different transports
picked for you by which environment you're in; you don't rewrite mocks when you move from a unit
test to a running app.

## Overriding per test, and the safety net

Most tests want the default handlers from a shared `handlers.ts`. A test that needs a specific
error case overrides at runtime with `server.use(...)`:

```ts
test('shows an error state on 500', async () => {
  server.use(
    http.get('/api/users/:id', () => HttpResponse.json({ message: 'boom' }, { status: 500 })),
  );
  // render, assert the error UI
});
```

`server.use()` overrides win over the base handlers for that test only — call `server.resetHandlers()`
(usually in an `afterEach`) to drop them. A handler registered with `{ once: true }` answers exactly
one matching request, then gets out of the way, which is the shape for "the first call fails, the
retry succeeds" tests.

The easiest MSW bug to ship is a typo'd URL that matches nothing: the request falls through every
handler and either hits the real network (slow, flaky, sometimes literally impossible in CI) or
hangs. `onUnhandledRequest: 'error'` — set where you call `setupServer`/`setupWorker`, or per-call —
turns that into an immediate, loud test failure instead of a silent pass or a mysterious timeout. A
resolver can also call `passthrough()` to explicitly say "let this one through," which is different
from *not* matching at all — it's an intentional escape hatch, logged as such, not a fallthrough.

## Beyond REST

`graphql.query('GetUser', resolver)` and `graphql.mutation(...)` match by operation name instead of
URL, because a GraphQL API is usually one endpoint carrying many operations — matching on path
alone wouldn't distinguish them. MSW 2.x also mocks WebSocket connections (`import { ws } from
'msw'`), letting you script server-sent messages for a live-updating UI without a real socket
server. Both follow the same handler-and-resolver shape as `http`.

## What this course's `@server/*` fakes are, instead

The `@server/todos`, `@server/users`, and `@server/posts` modules used elsewhere in this course are
in-process stubs: importable functions (`fetchUser(id)`) that return promises, with a `server`
object in checks to configure latency and failures. They're deliberately simpler than MSW — no
`Request`/`Response`, no network layer, no handler matching — because earlier lessons needed to
grade component behavior without teaching HTTP interception first. MSW is the version of that idea
built for the real network: the thing your component actually calls is `fetch`, not a fake import,
so the interception has to happen at the layer `fetch` talks to.

## Further reading

- [Mock Service Worker docs](https://mswjs.io/docs/) — mswjs.io
- [MSW: `http` request handlers](https://mswjs.io/docs/basics/request-handler) — mswjs.io
- [MSW: `onUnhandledRequest`](https://mswjs.io/docs/best-practices/avoid-request-assertions/) — mswjs.io
- [MSW: WebSocket API](https://mswjs.io/docs/basics/handling-different-transports/) — mswjs.io
