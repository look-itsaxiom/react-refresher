## Two environments, one tree

You've been writing components that all run in one place: the browser. React
Server Components (RSC) split a single tree across two runtimes — server and
client — and stitch the result together. This is not SSR with extra steps.
SSR renders client components to an HTML string once, then hydrates the exact
same component code in the browser. RSC introduces a component type, the
**Server Component**, whose code *never ships to the client at all*.

### What a Server Component actually is

A Server Component is a component function that runs once, on the server (at
build time for a static route, or per request for a dynamic one), and never
runs again on the client. Because it never runs in the browser:

- It can be `async` and `await` a database call or an internal service
  directly in the component body — no `useEffect`, no loading state
  boilerplate, no client-side waterfall.
- Its imports (an ORM, an API key, a markdown parser) never enter the client
  bundle. Zero client JS is the headline benefit, not a side effect.
- It cannot use `useState`, `useEffect`, `useContext`, refs, or any browser
  API. There is no "second render" for it to hold state across, and no
  window/document for it to touch.

```tsx
// ProductPage.tsx — a Server Component (no directive needed; this is the default)
async function ProductPage({ id }: { id: string }) {
  const product = await db.products.findById(id); // runs on the server, only
  return (
    <article>
      <h1>{product.name}</h1>
      <FavoriteButton productId={product.id} initialCount={product.favorites} />
    </article>
  );
}
```

Every component is a Server Component by default in an RSC-enabled framework
(Next.js App Router, React Router 8's framework mode). You opt *out* of the
server, not into it.

### `'use client'`: a module boundary, not a label on "client-side code"

`FavoriteButton` above needs `useState` for an optimistic like count, so it
needs to run in the browser. You mark the **module** it lives in:

```tsx
'use client';

import { useState } from 'react';

export function FavoriteButton({ productId, initialCount }: { productId: string; initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  return <button onClick={() => setCount((c) => c + 1)}>♥ {count}</button>;
}
```

The easy misreading is "`'use client'` marks client-side code." It doesn't —
it marks a **boundary crossing point** for the module graph. Concretely:
everything that module exports becomes a *client reference*: a pointer the
server-rendered tree can hold onto and hand to the browser, instead of trying
to execute. The directive says "stop compiling this subtree into the server
bundle, and instead ship it as a separate client bundle entry." Nothing about
the directive says the component's *logic* only makes sense on a client —
plenty of `'use client'` components render static markup and only need the
directive because they import something (a click handler, a hook) that
requires it.

Also non-obvious: `'use client'` only needs to go on the module where the
boundary starts. If `FavoriteButton` imports a `formatCount` helper from a
plain `.ts` file, that helper does not need its own directive — it gets
bundled into the client chunk because something client-side imported it.

### Composition rules: the boundary only goes one way

- A Server Component can import and render a Client Component directly.
  This is the normal, common case — most trees are server-by-default with
  client "leaves" for interactivity.
- A Client Component **cannot import** a Server Component. Once you're in
  client code, every import is resolved as more client code — there's no
  server left to run a Server Component's `await db.query(...)` at that
  point, so the bundler doesn't let it happen.
- The escape hatch: a Client Component *can still render* a Server
  Component if the server passes it down as `children` or another prop.

```tsx
// Server Component
function Layout({ children }: { children: React.ReactNode }) {
  return <ClientShell>{children}</ClientShell>; // children was rendered on the server
}

// 'use client'
function ClientShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return <div className={open ? 'open' : 'closed'}>{children}</div>;
}
```

`ClientShell` never imported the Server Component that produced `children` —
it just received an already-rendered result as a prop, the same way it would
receive any other JSX. This "slot" pattern is the standard way to keep
server-only data fetching close to the top of a tree while still nesting it
inside client-interactive chrome (a client-side modal, tabs, or theme
provider).

### The payload: what actually crosses the wire

A Server Component doesn't render to HTML the way `renderToString` does.
It renders to a serialized description of the tree — historically called
**Flight**, the RSC payload format — that describes host elements (`div`,
`button`, ...), inlines the *output* of nested Server Components, and leaves
placeholders for Client Component references (a module id the client already
has, or will fetch). The client's React runtime reads that payload and
reconstructs the tree, mounting real Client Components at the placeholders
and hydrating from there. On an initial page load, this payload is typically
embedded alongside streamed HTML so the page paints before JS finishes
loading; on a client-side navigation in an RSC-enabled router, the same
payload format is fetched directly and patched into the existing tree
without a full document reload.

Streaming matters here: because a Server Component can `await` slow data,
the framework can send the parts of the payload that are ready immediately
and stream in the rest as `Suspense` boundaries resolve, rather than blocking
the entire response on the slowest fetch.

### Where this leaves state, effects, and the browser

Anything stateful, anything that reacts to user input, anything that touches
`window`, `localStorage`, or a browser event — that code has to live below a
`'use client'` boundary, because it needs a second, ongoing execution in the
browser. Server Components render exactly once per request and are gone;
there's no re-render to receive a `setState` update. This is the practical
test for where the boundary goes: not "is this component simple" but "does
anything here need to run again, in the browser, after the initial render."

### Further reading (optional)

- [react.dev — Server Components](https://react.dev/reference/rsc/server-components)
- [react.dev — 'use client'](https://react.dev/reference/rsc/use-client)
- [Next.js — Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [React Router 8 — Server Components (framework mode)](https://reactrouter.com/)
