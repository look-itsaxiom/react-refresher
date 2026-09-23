# Where they differ in practice

All three frameworks give you server rendering, data loading, and mutations. The
decisions that actually distinguish them show up once you're building, not when you're
reading a feature list.

## Routing conventions

Next.js's `app/` directory *is* the router: a folder is a route segment, `page.tsx` makes
it navigable, `[param]` and `[...catchAll]` are dynamic segments, `(group)` folders
organize without routing. React Router 8 defaults to a config file (`app/routes.ts`)
that maps URL patterns to route module files explicitly — you can opt into file-system
conventions instead, but the config file is the default because it makes the full route
table visible in one place, which the App Router's directory tree doesn't. TanStack
Start's router is file-based too, but every route is generated into a fully-typed route
tree at build time, so a typo in a route path or an unused param is a type error, not a
404 discovered at runtime.

## Data loading model

Next.js's model is "the component *is* the data fetch" — an `async function Page()`
Server Component calls `fetch` or hits a database directly, and React's Suspense
boundaries control what streams in first. There's no separate `loader` export; the
component and the loading logic are one unit, which is convenient until you need to
trigger the same fetch from two differently-shaped routes and end up extracting a shared
function anyway. React Router keeps loading and rendering as two separate exports
(`loader` and the default component) precisely so a loader can be tested, reused, or
swapped for a `clientLoader` without touching the component. TanStack Start follows
React Router's split — loaders on the route definition, component reads the result via a
typed hook — but adds compile-time guarantees that Next.js and React Router's community
conventions leave to discipline: a loader's return type flows into the component's props
without a manual cast.

## Mutations

Next.js Server Functions (`"use server"`) can be called directly as a form's `action`
prop or from a client event handler — the function reference itself crosses the
boundary, serialized by the framework. React Router's `action` export is invoked by
*name*, not by reference: submitting a `<Form>` or calling `useFetcher().submit()` POSTs
to the current route, and the framework runs that route's `action`, then automatically
revalidates every `loader` currently on the page. TanStack Start's `createServerFn` sits
in between — you call it like a function, but it's a "this becomes an HTTP endpoint"
transformation at build time, not a React-level serialization boundary, and you decide
manually whether to invalidate a query afterward.

## Caching and revalidation defaults

This is the sharpest edge in Next.js 16: caching went from "on by default, opt out with a
config knob" (Next.js ≤14) to "off by default, opt in with `"use cache"`" (Next.js 16 with
Cache Components enabled). That's a mental model flip an experienced Next.js developer
has to unlearn. React Router has no route-level caching layer of its own — revalidation
after an action is automatic, but *caching* loader responses across navigations is left to
you (or a data-fetching library layered on top, like TanStack Query). TanStack Start
inherits TanStack Query's caching model when you use it for data (most Start apps do),
which means cache keys, staleness, and invalidation are explicit and inspectable rather
than framework magic.

## Deployment and lock-in

Next.js's most efficient deployment target is Vercel — self-hosting works and is
documented, but some features (certain caching backends, image optimization defaults)
assume Vercel's infrastructure unless you configure alternatives. React Router 8 and
TanStack Start are both Vite-based and ship as standard Node (or edge-runtime)
server builds with adapters for common hosts, which makes them closer to "deploy anywhere
Vite deploys" — less framework-specific infrastructure to replicate elsewhere.

## Migrating a Vite SPA

This project is a Vite SPA. Each framework has a different on-ramp from here:

- **To React Router 8 framework mode**: closest migration. Swap `<BrowserRouter>` for
  the framework's Vite plugin, convert route components into route modules, move
  `useEffect` data fetching into `loader` functions incrementally, route by route.
- **To TanStack Start**: similar shape to React Router's migration, plus adopting
  TanStack Router's route tree generation and, usually, TanStack Query for data if not
  already in use.
- **To Next.js**: the biggest jump, because it's not just a router swap — it's adopting
  a server rendering model (RSC) as the default, which means auditing every component for
  browser-only APIs and marking client boundaries explicitly, not just relocating fetches.

## A short decision rubric

- Want the framework to make server rendering the default and handle caching for you,
  and you're fine deploying somewhere that assumes that model? **Next.js.**
- Want data loading and mutations as an explicit, testable layer with minimal new mental
  model on top of Vite, and you're not sold on RSC yet? **React Router 8 framework mode.**
- Want maximal type safety end-to-end and you're already comfortable composing your own
  caching (or already use TanStack Query)? **TanStack Start.**
- Content-heavy, mostly-static site where interactivity is the exception, not the rule?
  **Astro.**

Lessons 44 through 48 come back to this decision with the tradeoffs that matter
independent of which framework you pick — CSR vs. SSR vs. SSG, and when server rendering
is worth its cost at all.

## Further reading (optional)

- [React Router: Actions](https://reactrouter.com/start/framework/actions)
- [React Router: Framework vs. Data vs. Declarative mode](https://reactrouter.com/start/modes)
- [TanStack Start documentation](https://tanstack.com/start/latest)
- [Next.js: Upgrading to version 16 (Cache Components, proxy.ts)](https://nextjs.org/docs/app/guides/upgrading/version-16)
