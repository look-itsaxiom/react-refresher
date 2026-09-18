## Serialization, security, and mental traps

The boundary in the last lesson isn't just an architectural line — it's a
serialization boundary, and serialization boundaries are where security bugs
live. This lesson covers what exactly is allowed to cross, why the rule
exists, a real incident that made the stakes concrete, and the tools React
and Next.js give you to keep the boundary honest.

### What crosses: the exact rule

When a Server Component passes props to a Client Component, React has to
turn every prop value into something it can write into the Flight payload
and reconstruct on the other side. Per the current react.dev reference, the
supported types are:

- Primitives: `string`, `number`, `bigint`, `boolean`, `undefined`, `null`
- Symbols, but **only** ones registered globally with `Symbol.for(...)` —
  a locally created `Symbol('x')` cannot be looked up by the client, so it's
  rejected
- Plain objects (built from object literals) and arrays, as long as every
  value inside them is itself serializable
- `Date`, `Map`, `Set`, `TypedArray`, `ArrayBuffer`
- `Promise` — the Client Component receives a promise it can `use()`; the
  resolved value is streamed in later as more of the payload arrives
- JSX / React elements — a Server Component can pass an already-rendered
  subtree as `children` or any other prop
- Functions, but only two kinds: a **Server Function** (marked `'use
  server'`, which becomes a reference the client can call back over the
  wire) and a **client reference** — a component or function that already
  lives in a `'use client'` module, which is legal to pass around as a value
  (e.g. `<Tabs renderIcon={StarIcon} />` where `StarIcon` is a client
  component)

What's explicitly **not** supported: ordinary functions that aren't Server
Functions or client references, class instances (anything `new`'d from a
class other than the built-ins above), objects with a null prototype, and
unregistered symbols. React doesn't silently drop these — it throws, because
there is no way to represent "call this function" or "reconstruct this exact
class instance" in a plain-data payload. The rule is really one idea: **only
plain data, and references to things the other side already knows how to
resolve, survive the trip.**

This is also why passing a whole Prisma/database row through as a prop is a
common bug even when it "looks like" plain data — ORMs often return class
instances or objects with methods attached, not object literals, so they
fail the same check a `new Date()`-holding plain object would pass.

### Why the rule exists, and what happens when it's bypassed: CVE-2025-55182

In December 2025, the React team disclosed **CVE-2025-55182**, a critical
(CVSS 10.0) vulnerability in `react-server`'s handling of the Flight
protocol — the same payload format from the previous lesson. The bug: an
attacker could submit a crafted Flight payload to a Server Function endpoint
containing an object shaped like an internal "chunk" with its own `then`
method. React's deserializer, resolving what it believed was a promise,
invoked the attacker-controlled `then` handler — attacker-controlled code
execution, with no authentication required, against default configurations.
It was exploited in the wild within days of disclosure, with post-exploit
activity including cloud credential theft and cryptomining. Patches shipped
in React 19.x immediately; if you inherit or maintain any RSC-based app,
confirm its React and framework versions are current before treating this as
historical.

The lesson isn't "avoid RSC" — it's what deserialization boundaries always
teach: the moment code accepts a structured payload from an untrusted client
and turns it back into live objects, the *deserializer's* correctness is
part of your attack surface, independent of whatever validation your own
Server Functions do. Keep the framework and React version current, and don't
assume "it's just data" makes a payload boundary safe by default.

### Keeping accidental leaks out: `server-only`, `client-only`, and taint APIs

Two small marker packages exist purely to fail your build early:

- `import 'server-only'` at the top of a module makes it a build error to
  import that module from client code — the standard way to stop a database
  client or an API-key-holding config module from ever reaching a client
  bundle by accident (e.g. via a chain of re-exports nobody audited).
- `import 'client-only'` does the reverse: guards a module that assumes
  `window` exists.

Neither of these stops a *value* — like a user's session token — from being
handed to a Client Component as an ordinary, perfectly serializable string
prop. That's what React's taint APIs are for: `experimental_taintUniqueValue`
marks a specific value (a password, an API key) so that if it's ever passed
toward a Client Component, React throws instead of serializing it; the
sibling `experimental_taintObjectReference` does the same for a whole object
reference. As of September 2026 both remain explicitly experimental — real,
usable, but not a stable guarantee — so treat them as one layer, not a
substitute for reviewing what a Server Component actually passes down.

### Caching and the request lifecycle: where "use cache" fits

A Server Component re-runs its `await`s on every request by default in Next
16's Cache Components model — data is dynamic unless you opt in to caching.
The `'use cache'` directive, enabled via the `cacheComponents` flag, marks a
route segment, a component, or a plain async function as cacheable; the
compiler derives the cache key from its arguments and closed-over values
automatically, and the function must be `async`. This is a distinct axis
from the client/server split you've been learning: `'use client'` decides
*where* code runs, `'use cache'` decides *how often* a server-side read
actually re-executes versus reusing a stored result. A Server Component can
be both — dynamic per request, or cached and revalidated on your terms.

### RSC vs. SSR vs. Server Functions

- **SSR** renders your existing client component tree to HTML once per
  request, then hydrates the same code in the browser. It doesn't change
  what code *can* run where — everything is still client code, just also
  pre-rendered.
- **RSC** adds a component type that runs only on the server and never
  ships, changing the client bundle's size and what's even possible to do
  directly in a component body (raw DB access, secrets).
- **Server Functions** (`'use server'`, covered next) are the other
  direction across the same boundary: instead of the server handing data
  down to the client, a Client Component calls back into server code
  directly, without you hand-writing a REST endpoint.

RSC and SSR aren't competitors — a Next.js or React Router 8 page typically
uses both: Server Components for the initial data-bearing render, streamed
as HTML via SSR mechanics, with Client Components hydrating the interactive
leaves.

### Further reading

- [react.dev — 'use client' (serializable prop types)](https://react.dev/reference/rsc/use-client)
- [React blog — Critical Security Vulnerability in React Server Components (CVE-2025-55182)](https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components)
- [react.dev — experimental_taintUniqueValue](https://react.dev/reference/react/experimental_taintUniqueValue)
- [Next.js — 'use cache' directive](https://nextjs.org/docs/app/api-reference/directives/use-cache)
