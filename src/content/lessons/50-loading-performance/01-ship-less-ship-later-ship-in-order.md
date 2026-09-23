# Ship less, ship later, ship in order

Lesson 36 covered how a bundler decides which modules land in which chunk. This lesson is
about the decision that comes before that: which chunks the browser should fetch, when,
and in what priority order, so the page a user is looking at gets interactive as fast as
possible. Lesson 11 showed `preload`/`preinit` as a way to warm one resource ahead of a
render. Here they're one tool among several for shaping the whole loading sequence.

## The critical path budget

Every navigation has a critical path: the chain of requests that must finish before the
page is usable. HTML, then the CSS and JS the initial render needs, then the data that
JS fetches. Anything not on that chain — a settings modal, a chart library, an admin-only
route — is weight the first paint is paying for and getting nothing back. The first move
is always "does this need to be in the initial bundle at all," not "how do I make the
bundle load faster."

Route-level code splitting is the highest-leverage version of this. Instead of one bundle
for the whole app, each route ships its own chunk, loaded when the user navigates there:

```tsx
import { lazy, Suspense } from 'react';
import { startTransition } from 'react';

const Settings = lazy(() => import('./routes/Settings'));

function App() {
  const [route, setRoute] = useState<'home' | 'settings'>('home');
  return (
    <Suspense fallback={<PageSkeleton />}>
      {route === 'settings' ? <Settings /> : <Home />}
    </Suspense>
  );
}
```

`React.lazy` wraps a dynamic `import()` so the module (and everything it statically
imports) becomes its own chunk, fetched only when that component first renders. Every
router built on React — React Router 8's `lazy` route property, Next.js 16's automatic
per-route splitting in the App Router — is this same primitive with routing conventions
layered on top. If you're not on a framework that splits routes for you, `React.lazy` at
the route boundary is the one splitting decision that pays for itself almost everywhere.

## Component-level splitting and the flash of fallback

Below the route level, split anything expensive that isn't needed for first paint: a
charting library, a rich text editor, a modal that's closed by default. The trade-off is
the fallback flash — if the chunk arrives in 40ms, showing a spinner for one frame reads
as jank, not as a loading state. Two techniques soften this:

- **Preload before the interaction that needs it.** `React.lazy`'s loader function is
  just `() => import('./Chart')`; calling that function early — on hover, on viewport
  entry via `IntersectionObserver`, or right after the route that will need it mounts —
  starts the fetch without rendering anything. By the time the user actually clicks, the
  module is already in memory and `Suspense` never shows a fallback at all. This is the
  same warm-the-cache idea as lesson 11's `preload`, applied to JS chunks instead of an
  image.
- **Keep the current UI visible during the fetch.** Wrapping the state update that swaps
  in the lazy component with `startTransition` tells React this update can be deferred:
  the currently rendered tree stays on screen (and interactive) until the new chunk and
  its first render are ready, instead of yanking to the `Suspense` fallback immediately.
  Combine both — preload on hover, transition on click — and most component-level splits
  never show a spinner during normal use; the fallback only appears on a cold, unwarmed
  load.

## Avoiding accidental waterfalls

Splitting can backfire if it creates a request waterfall: fetch the route chunk, parse
it, discover it needs data, fetch the data, discover the data-fetching code needs another
chunk. Each hop adds a full round trip in serial instead of in parallel. Two defenses:

- **Start code and data at the same time.** A router that supports it (React Router 8's
  data APIs, Next.js 16's Server Components) kicks off the route's data fetch and its
  code fetch together instead of code-then-data. Where you own the fetch yourself, kick
  it off outside the `lazy` boundary — at the click handler, in parallel with the
  `import()` — rather than inside the lazy component's body where it can't start until
  the component has rendered once.
- **Tell the browser about a chunk before you need it.** `<link rel="modulepreload">`
  fetches, parses, and compiles an ES module chunk into the module map without executing
  it, which is faster than `rel="preload"` for JS specifically because the browser can
  skip the redundant compile step later. Vite 8 emits `modulepreload` links for a page's
  direct dependency chunks automatically as part of `build.modulePreload` (on by default,
  with a polyfill injected for browsers that predate native support); for chunks you know
  you'll need soon but that Vite can't see statically — the next likely route — call
  `preload`/`preinit` from `react-dom` yourself, same as lesson 11.

## Priority: fetchpriority, preload misuse, and third-party scripts

Not every request on the critical path is equally urgent. `fetchpriority="high"` on an
`<img>`, `<link rel="preload">`, or `<script>` tells the browser's scheduler to fetch that
resource ahead of same-type requests that would otherwise be queued behind it — the
canonical use is the largest-contentful-paint image, which browsers often guess wrong
about because it's a background-image or arrives late in the DOM. `fetchpriority` reached
Baseline (widely available) in October 2024, so it's safe to use everywhere in 2026.

`rel="preload"` is easy to misuse: a preloaded resource that isn't used within a few
seconds triggers a Chrome DevTools warning and wastes bandwidth for nothing, and stacking
preloads for everything just recreates the priority problem preload was meant to solve —
now everything is "high priority." Reserve it for the one or two resources you can name
as blocking first paint that the browser wouldn't otherwise discover early (a font, a
hero image referenced from CSS).

For `<script>`: a plain `<script src>` blocks parsing until it downloads and runs.
`defer` downloads in parallel and runs after parsing, in document order — the default
for anything that isn't needed immediately. `async` downloads in parallel and runs as
soon as it's ready, out of order — fine for independent scripts (analytics) that don't
depend on the DOM or on each other. `type="module"` scripts are deferred by default.

Third-party scripts (analytics, chat widgets, ad tags) are disproportionately expensive
because you don't control their weight or their own waterfalls. Strategies, worst to
best case: load them with `async`/`defer` so they don't block; delay them until after
first input or a few seconds post-load using a library-agnostic idle callback; or run
them off the main thread entirely with a tool like Partytown, which proxies the script
into a web worker. A common middle ground is a **facade** — a lightweight placeholder
(a static screenshot of a YouTube embed, a fake chat bubble) that only loads the real
third-party script on user interaction, which is exactly the lazy-component pattern above
applied to someone else's code.

## Further reading (optional)

- [web.dev: Reduce JavaScript payloads with code splitting](https://web.dev/articles/reduce-javascript-payloads-with-code-splitting)
- [react.dev: lazy](https://react.dev/reference/react/lazy)
- [MDN: fetchpriority](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/fetchpriority)
- [web.dev: Efficiently load third-party JavaScript](https://web.dev/articles/efficiently-load-third-party-javascript)
