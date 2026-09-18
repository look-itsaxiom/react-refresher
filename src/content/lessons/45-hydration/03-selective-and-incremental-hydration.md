# Making hydration cheap and incremental

Fixing mismatches makes hydration *correct*. It doesn't make it *cheap* — a
page with one giant client bundle still has to download, parse, and run all
of it, and run every component's first render, before any of it responds to
a click. The rest of this lesson is about shrinking that cost: hydrating less,
hydrating later, and hydrating in the right order.

## Selective hydration: Suspense boundaries hydrate independently

Since React 18, `hydrateRoot` treats each `<Suspense>` boundary as its own
unit of hydration instead of hydrating the whole tree in one synchronous
pass. Concretely:

- If the JavaScript for a boundary lower on the page hasn't arrived yet,
  React hydrates the boundaries around it without waiting.
- If the user clicks or types inside a boundary that hasn't hydrated yet,
  React jumps the queue: it hydrates *that* boundary synchronously, ahead of
  whatever else was scheduled, so the click isn't ignored.
- The click itself isn't lost while React catches up. React attaches a
  capturing listener at the root before hydration finishes and **replays**
  the event once the relevant boundary has hydrated, so a tap during the gap
  still fires the handler instead of silently doing nothing.

This is what makes `<Suspense>` boundaries a real unit of granularity for
hydration cost, not just for loading UI. A page built as "shell, then a
Suspense boundary per below-the-fold section" gets interactive top-to-bottom
progressively, and a boundary that's slow to hydrate doesn't block a click
somewhere else on the page.

## Streaming and progressive hydration

Streaming SSR (`renderToPipeableStream` / `renderToReadableStream`) and
selective hydration are the same idea applied to two different phases: the
server flushes HTML for each `Suspense` boundary as its data resolves
instead of waiting for the whole page, and the client hydrates each
boundary as its script arrives instead of waiting for the whole bundle. The
result is a page that becomes visible in pieces and interactive in pieces,
in roughly the same order, without you writing any of the sequencing by
hand — you just decide where to put the `Suspense` boundaries.

## Islands: hydrate only what needs to be interactive

Selective hydration still assumes most of the page *will* hydrate
eventually, just not all at once. Islands architecture (Astro is the clearest
example) makes a stronger claim: most of the page never ships component
JavaScript at all, because most of a typical page — headers, article text,
footers — has no interactivity to attach.

Astro's `client:*` directives put you in control of exactly when each
island hydrates:

- `client:load` — hydrate immediately, same as a normal SPA component.
- `client:idle` — hydrate once the main thread is free
  (`requestIdleCallback`).
- `client:visible` — hydrate when the island scrolls into view
  (`IntersectionObserver`).
- `client:media` — hydrate only if a media query matches (a mobile-only nav
  drawer never ships its JS to desktop visitors).
- `client:only` — skip server rendering for this component entirely; render
  it purely on the client (for things that can't run server-side at all,
  like a canvas library that needs `window` to even initialize).

Everything without a `client:*` directive renders to HTML at build or
request time and ships **zero** JavaScript for that component. That's the
actual cost win over selective hydration: it's not "hydrate the static
header later," it's "the static header was never a hydration candidate."

**Server islands** (Astro) extend the same idea to slow *data*, not just
unneeded *JavaScript*: a component that needs a per-request database call or
personalized data renders on the server, but separately from the rest of
the page and streamed in once it's ready, so one slow fetch doesn't block
the static shell around it. It's the "island" mental model applied to
"don't make everyone wait for the slowest fetch," not to hydration cost per
se.

## Partial Prerendering: static shell, dynamic holes, one response

Next.js's Partial Prerendering (stable since Next.js 16, October 2025, under
the `cacheComponents` model that replaced the earlier experimental `ppr`
flag) is islands' mirror image on the rendering side: instead of "opt in to
client JS per component," it's "opt in to a static shell per route, with
explicit dynamic holes." At build time, Next.js prerenders everything it can
into a static HTML shell; at request time, that shell is served instantly and
the dynamic pieces (the ones reading cookies, headers, or uncached data)
render and stream into their holes. The framework infers what's static from
what you access — read `cookies()` inside a component and that component
becomes a dynamic hole; don't, and it's part of the static shell.

## Resumability: the alternative that skips hydration entirely

Qwik's pitch is worth knowing as the contrast, because it clarifies what
"cost" actually means here: hydration's cost isn't just "download and run
JS," it's "re-execute component logic on the client to reconstruct state and
listeners that the server already computed once." Qwik serializes not just
HTML but the *application state and event listener wiring* into the page,
so the client can **resume** exactly where the server left off — attaching a
listener from serialized data — without re-running component functions at
all. No hydration step means no hydration mismatches, either. It's a
different tradeoff (the framework has to serialize a lot more, and the
mental model is stricter about what can cross the boundary), not a strictly
better one, but it's the clearest evidence that "ship less JS" and "hydrate
faster" are two different problems, and resumability targets the second one
directly.

## Where React Server Components fit in this picture

RSC (lesson 21) attacks the same cost from a third angle: a Server
Component never ships to the client at all — no serialized output for it to
hydrate, because it isn't part of the client tree in the first place. The
combination used by Next.js's App Router is effectively "RSC to shrink the
client bundle down to only the Client Components that need it, selective
hydration to bring those in progressively, PPR to serve a static shell
instantly around whatever's still dynamic." None of the three is a
replacement for the others; they're independent knobs on the same cost.

## Further reading

- [react.dev — root APIs, `hydrateRoot`](https://react.dev/reference/react-dom/client/hydrateRoot)
- [Astro docs — client directives](https://docs.astro.build/en/reference/directives-reference/#client-directives)
- [Astro docs — Server Islands](https://docs.astro.build/en/guides/server-islands/)
- [Next.js docs — Partial Prerendering](https://nextjs.org/docs/app/guides/ppr-platform-guide)
- [Qwik docs — Resumability](https://qwik.dev/docs/concepts/resumable/)
