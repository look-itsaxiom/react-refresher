# Three ways to ship React on the server

The previous two lessons covered React's server primitives directly: Server Components
running on a server with no client bundle, and Server Functions callable from the client
across a serialization boundary. Nobody hand-wires those primitives into a bundler and a
routing layer from scratch. Three frameworks package them, each with a different opinion
about how much of the plumbing you should see. As of September 2026 the versions are
Next.js 16.3, React Router 8.4 (framework mode), and TanStack Start 1.x.

## Next.js App Router

Next.js is still the framework that leans hardest into RSC as the default rendering
model — every route in `app/` is a Server Component unless it (or an ancestor) opts into
`"use client"`. Next.js 16 changed three things worth knowing if you last looked at
Next.js 14 or early 15:

- **Turbopack is the default bundler**, for both `next dev` and `next build`. Webpack is
  still selectable, but it's no longer what a new app gets.
- **Caching became explicit.** Next.js 16 removed the old implicit full-route caching
  behavior and the experimental `experimental_ppr` flag. In its place, Cache Components
  (enabled via `cacheComponents: true` in `next.config.ts`) makes caching opt-in: a
  `"use cache"` directive at the top of a function, component, or file marks that unit as
  cacheable, and Partial Prerendering — serving a static shell instantly while streaming
  in the dynamic, request-specific parts — now falls out of that model instead of being a
  separate flag you toggle.
- **`middleware.ts` was renamed `proxy.ts`.** Same primitive (code that runs on every
  matched request before a route handles it — auth checks, redirects, rewriting), new
  name, chosen to make clear it's a network-edge concern rather than a place to put
  business logic.

Route conventions are unchanged in spirit: `app/blog/[slug]/page.tsx` is a dynamic
segment, `app/(marketing)/about/page.tsx` uses a route group (the parenthesized segment
organizes files without appearing in the URL), `layout.tsx` files nest automatically down
the directory tree, and Server Functions are declared with `"use server"` and called
directly from form actions or client event handlers — the mechanics of lesson 22.

## React Router 8, framework mode

React Router ships two ways to use it: as a library (the `<BrowserRouter>` API you
already know from React 18 apps), and as **framework mode**, where you hand it a
`react-router.config.ts` and a `app/routes.ts` (or file-system conventions) and it
generates the router, code-splitting, and a Vite dev server around **route modules**.

A route module is a single file that exports a matched set of named functions the
framework calls at the right time: `loader` (runs on the server, fetches data before the
route renders), `clientLoader` (runs in the browser — the escape hatch for SPA-only data
or client-side caching), `action` (runs on the server in response to a form submission or
`useFetcher` call, and by convention triggers revalidation of every loader on the page
afterward), `clientAction`, `meta` (document head tags), and the default export, the route
component itself, which receives loader data through a typed hook rather than props
drilled down.

Two things changed by React Router 8: **middleware is a first-class, default-available
export** (`middleware` and `clientMiddleware` arrays on a route module, composing down the
matched route tree, replacing the request-wrapping patterns teams previously hand-rolled),
and **RSC support remains unstable** — React Router's Vite plugin has experimental flags
for rendering route components as Server Components, but as of 8.4 it isn't the default
and the team documents it as evolving, not load-bearing. React Router 8 is Vite-based
throughout; there's no separate bundler story to learn.

## TanStack Start

TanStack Start is the newest of the three, built on TanStack Router and Vite, and it
takes a different bet than the other two: instead of RSC, it leans on **server
functions** (`createServerFn`) as the one boundary-crossing primitive, plus TanStack
Router's fully type-safe route tree (route params, search params, and loader return types
are all inferred, not stringly-typed). A `createServerFn({ method: 'POST' }).handler(...)`
call is close in spirit to a React Server Function, but it's a TanStack-specific API you
call explicitly, not a React primitive triggered by a `"use server"` directive on a
component-adjacent function.

The TanStack team's own July 2026 postmortem, "We Stopped Using RSC on TanStack.com,"
is worth reading in full: they shipped RSC on their own marketing site, then pulled it
out in favor of ordinary SSR, citing exactly the boundary-tracking cost this lesson's
sibling lessons cover — route components receiving a mix of server-only and
client-serializable values made routine content changes turn into "is this a server
boundary" questions. That experience report, not a spec change, is why Start's public
stance on RSC is "not the default, not clearly worth it yet" rather than "coming soon."

## Honorable mentions

Two more frameworks are worth knowing the shape of, even briefly: **Astro** popularized
the *islands* architecture — pages are static HTML by default, and individual components
opt into client-side hydration (`client:load`, `client:visible`, ...) rather than the
whole tree being a client bundle by default. It supports React components as islands but
isn't React-first. **Waku** is a minimal RSC-first framework from one of the original RSC
working-group members, closer to "just React's server primitives plus a router," useful
as a reference for what RSC looks like without a large framework's opinions layered on
top.

## Further reading (optional)

- [Next.js 16 release notes](https://nextjs.org/blog/next-16)
- [Next.js: Upgrading to version 16](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [React Router: Route Module reference](https://reactrouter.com/start/framework/route-module)
- [React Router: Picking a Mode](https://reactrouter.com/start/modes)
- [TanStack: We Stopped Using RSC on TanStack.com](https://tanstack.com/blog/we-stopped-using-rsc-on-tanstack-com)
