# Data on the server, then the client

You already know the SSR pipeline from the previous lesson: render on the
server, send HTML, hydrate on the client. The part that pipeline glossed
over is where the *data* the render needs comes from, who's allowed to see
it, and how it gets from a server process into a browser tab without
leaking between requests or opening an XSS hole. That's the plumbing this
lesson covers.

## Where data loading actually runs

Three shapes exist in production frameworks today, and they're easy to
confuse because they all "load data before the page shows up."

**RSC async components (Next.js App Router, TanStack Start).** A Server
Component can be `async` and `await` a database call or `fetch` directly
in its body — no `getServerSideProps`, no loader function, just a
component that happens to run only on the server:

```tsx
// app/orders/[id]/page.tsx — a React Server Component
async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // Next.js 16: params is itself a Promise
  const order = await db.orders.findById(id);
  return <OrderDetail order={order} />;
}
```

The component tree *is* the data-loading graph. Nested Server Components
each fetch what they need, React streams the result, and client
components lower in the tree receive already-resolved props — they never
see the fetch.

**Route loaders (React Router 8, TanStack Router, Remix's ancestor).** Data
loading is a function attached to a route, separate from the component:

```tsx
// React Router 8
export async function loader({ params, request }: Route.LoaderArgs) {
  const cookie = request.headers.get('Cookie');
  const order = await getOrder(params.id, cookie);
  return { order };
}
export default function OrderPage({ loaderData }: Route.ComponentProps) {
  return <OrderDetail order={loaderData.order} />;
}
```

The loader runs before the component renders, on the server for the
initial request and optionally again on the client (`clientLoader`) for
subsequent navigations — the framework decides which, you just write both
if you need both.

**Legacy per-page functions (`getServerSideProps`).** Still supported by
Next.js for the Pages Router, but the App Router has replaced it with RSC
data fetching. If you're reading code from before ~2023, this is what
you're looking at; don't reach for it in new code.

The shift across all three: data loading used to be something a
`useEffect` did *after* the component mounted. Now it's something that
happens *before* the component exists, on the server, with the result
arriving as props or as an already-resolved value a Server Component
awaited. `useEffect` for initial data is now almost always wrong in a
framework that supports loaders or RSC.

## Request context: cookies, headers, and the module-scope trap

A request handler needs per-request identity — who's asking, what locale,
what feature flags. Next.js 16 exposes this through `cookies()` and
`headers()`, which are **async** functions you must `await`:

```tsx
import { cookies, headers } from 'next/headers';

async function getSession() {
  const store = await cookies();
  const token = store.get('session')?.value;
  return token ? verifySession(token) : null;
}
```

They became async in Next.js 15 specifically so the framework can
statically analyze which routes need request data and which can be
prerendered — a route that never calls `cookies()` can be built once and
served from a CDN forever; one that does can't.

The trap this setup is designed to prevent: a Node server process handles
many requests concurrently on the same event loop, sharing one module
instance per file. Anything you store in a plain module-level variable is
shared across every request in flight:

```ts
// BUG: shared across every concurrent request on this server process
let currentUser: User | null = null;

export async function loader({ request }: LoaderArgs) {
  currentUser = await getUserFromCookie(request); // request A sets this...
  await slowEnrichment();                          // ...request B's loader
  return { user: currentUser };                     // runs in between and
}                                                    // overwrites it
```

Under low traffic this looks fine in every test. Under real concurrency,
user A's response can carry user B's data. The fix is unglamorous: pass
request-scoped values as function arguments or store them in a
request-scoped container (Node's `AsyncLocalStorage`, or a value threaded
through loader arguments), never in a bare module-level `let`. React
itself has the same rule for `cache()` — it memoizes per request, not
across requests, precisely so a cached DB call in one request can't leak
into another.

## Getting state to the client without shipping an exploit

Once the server has the data, the client needs a copy to hydrate against
— React's hydration compares what it *would* render to what's already in
the DOM, and it needs the same data the server used or it mismatches (see
the previous lesson). Frameworks embed this as JSON in a `<script>` tag:

```html
<script type="application/json" id="__DATA__">
  {"order":{"id":"42","total":19.99}}
</script>
```

Two problems hide in "just `JSON.stringify` it and drop it in a tag."
First, if the data contains a string like `</script><script>evil()</script>`,
naively embedding it lets an attacker's markup close your script tag
early and inject their own — this is a real, exploitable stored-XSS
pattern whenever user content flows into the serialized state. Second,
plain `JSON.stringify` can't represent `Date`, `Map`, `Set`, `undefined`,
or `bigint` — they become strings, disappear, or throw. Frameworks solve
this with a hardened serializer (`devalue`, used by SvelteKit and
Nuxt's Payload, or `superjson`, popular in tRPC/Next.js stacks) that
escapes the dangerous sequences and tags rich types for reconstruction.
You'll build a minimal version of one in this lesson's first exercise.

## Not fetching twice

The other half of "don't waste the request": if a route loader already
fetched the order, the client shouldn't refetch it the instant hydration
finishes. Two patterns handle this:

- **Loader data reuse.** React Router and Next.js both hand the
  server-fetched value to the component as data (`loaderData`, RSC props)
  that the client keeps using across the hydration boundary — no refetch
  unless the user navigates again or the data is explicitly invalidated.
- **Dehydrate/hydrate for client caches.** If you use TanStack Query
  alongside a loader, you fetch once on the server, call
  `dehydrate(queryClient)` to snapshot its cache, serialize that snapshot
  to the client, and call `hydrate(queryClient, snapshot)` before the
  first render. The query cache then believes it already has fresh data
  and won't refetch until `staleTime` expires — you get the loader's
  single fetch *and* keep all of Query's invalidation and refetch-on-focus
  behavior for later.

## Auth on the server

Because the loader/RSC data function is the first and only place a
request is fully in your hands, it's also the right place to enforce
auth — not in a `useEffect` that redirects after the unauthorized page has
already flashed on screen. Read the session in the loader or Server
Component, and either redirect (`redirect()` in Next.js, `throw redirect()`
in React Router) or return a typed "not authorized" result the component
renders explicitly. The client never re-derives identity from data the
server sent; it only reads what the server already decided.

## Further reading (optional)
- [React reference: `cache`](https://react.dev/reference/react/cache)
- [Next.js: `cookies()`](https://nextjs.org/docs/app/api-reference/functions/cookies)
- [React Router: data loading](https://reactrouter.com/start/framework/data-loading)
- [TanStack Query: SSR & hydration](https://tanstack.com/query/latest/docs/framework/react/guides/ssr)
