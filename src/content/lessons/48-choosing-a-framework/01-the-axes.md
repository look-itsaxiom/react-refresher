# What you're actually choosing

Lesson 44 gave you the rendering spectrum and how to pick per route. Lesson
23 gave you how Next.js, React Router, and TanStack Start each package RSC.
This lesson is the capstone: given all of that, how do you actually pick a
framework for a real project, including the non-React options nobody
mentions until it's too late to reconsider them? "Which framework is best"
is the wrong question — there is no best, only a set of axes your project
sits on differently than the next project. Work through the axes first;
the decision procedure in the next step is mechanical once you have them.

## Rendering model and RSC stance

This is the axis lesson 23 already covered in depth, so just the current
positions: Next.js 16.3 treats RSC as the default and only escapes to the
client with `"use client"`; caching is now explicit via `"use cache"` and
Cache Components rather than an implicit full-route cache. React Router
8.4's framework mode has RSC support behind an experimental flag — real,
but the team's own docs call it evolving, not load-bearing. TanStack Start
skipped RSC entirely and bet on `createServerFn` plus TanStack Query/Router
instead; their July 2026 postmortem on pulling RSC off tanstack.com is the
clearest public account of why a team that could have adopted it, didn't.
Astro, SvelteKit, and Nuxt don't have RSC at all — it's a React-rendering-tree
concept, and none of them ship a React-shaped component model by default.

## Routing style

File-system routing (`app/blog/[slug]/page.tsx`, Astro's `src/pages/`,
SvelteKit's `src/routes/+page.svelte`, Nuxt's `pages/`) versus a route tree
you define in code (TanStack Router, React Router's `routes.ts`). File-system
routing reads faster for small-to-medium apps — the directory *is* the sitemap.
A defined route tree pays off once nesting, guards, and typed params outgrow
what a folder name can express, which is TanStack Router's whole pitch: the
route tree is a single source of truth the type checker walks.

## Data loading and mutations

Every framework in this comparison has converged on the same shape — loaders
run before a route renders, actions run in response to a mutation, both
happen close to the route rather than in a `useEffect` — but the primitive
differs: Next.js Server Functions (`"use server"`), React Router
`loader`/`action` exports, TanStack `createServerFn` plus Router loaders,
SvelteKit `load` functions and form actions, Nuxt `useFetch`/server routes
under `server/api/`. None of these are meaningfully harder to learn than
another; the real cost is switching between them on a team that works
across frameworks.

## Type safety

"Typed routes" means different things per framework. Next.js's typed routes
check that `<Link href>` targets a route that exists. React Router 8 and
TanStack Router both generate types so a loader's return value flows,
inferred, into the component that reads it — TanStack Router's route tree
makes this the strongest of the three, since params, search params, and
loader data are all inferred from one file rather than stitched together.
SvelteKit generates a `$types` module per route with the same effect. None
of this replaces end-to-end testing, but it catches an entire class of
"renamed a param, forgot a call site" bugs at compile time instead of in
production.

## Bundler and dev speed

Next.js 16 defaults to Turbopack for both dev and build (Webpack still
selectable, no longer the default). React Router 8, TanStack Start, Astro,
and SvelteKit are all Vite-based end to end — there's no separate bundler
story to learn beyond Vite itself, which is also this course's own build
tool. Nuxt uses Vite by default with an experimental Rolldown-vite path.
Practically: if your team already knows Vite from building the SPA this
course teaches, three of these five frameworks hand you the same dev-server
mental model back.

## Deployment targets and lock-in

This is where framework choice quietly becomes vendor choice. Next.js's
deepest feature set (ISR, on-demand revalidation, image optimization) is
built and tuned against Vercel's infrastructure; running it elsewhere is
possible — OpenNext packages Next.js for AWS Lambda/CloudFront and
Cloudflare Workers — but you're running an unofficial adapter for the
optimized path, not the default one. React Router 8 and TanStack Start were
both designed vendor-neutral from the start: they compile to a request
handler you host on Node, an edge runtime, or a serverless platform without
an adapter layer standing between you and "regular Vite output plus a
server entry." Astro, SvelteKit, and Nuxt each ship an adapter system
(Astro's `@astrojs/*` adapters, SvelteKit's `adapter-auto`, Nuxt's Nitro)
that targets a wide host list out of the box. If avoiding lock-in is a hard
requirement, weight it explicitly — don't discover it during a hosting bill
renegotiation two years in.

## Ecosystem, hiring, and honesty about sentiment

State of JS 2025 usage data has Next.js far ahead of every other
meta-framework by adoption — and, in the same survey, showing a roughly
39-percentage-point satisfaction gap behind the category leader, Astro.
Both facts are true at once and they answer different questions: usage
predicts how easy hiring and Stack Overflow answers will be; satisfaction
predicts how your own team will feel building on it day 90. Don't let
either number alone make the call.

## Upgrade cadence and stability record

Next.js ships a major version roughly yearly with real breaking changes
(App Router's introduction, then Cache Components replacing the implicit
cache and `experimental_ppr` in 16) — usually with codemods, but codemods
still mean a migration PR. React Router 8 just absorbed Remix v2's feature
set as framework mode, which is a sign of consolidation, not churn. TanStack
Start reached a release-candidate 1.0 in September 2025 and, as of this
writing in September 2026, is still shipping pre-1.0 releases with a
documented-stable API — worth directly re-checking before you bet a
production app on it. Astro 7, SvelteKit 2 (with Svelte 5's runes, stable
since October 2024), and Nuxt 4 are all past their volatile years; Nuxt 3
reached end-of-life on July 31, 2026, which is itself a data point about how
long a major version stays supported once you adopt it.

## The non-React landscape, one honest paragraph each

**SvelteKit.** Svelte compiles away — no virtual DOM, no runtime
diffing — and Svelte 5's runes (`$state`, `$derived`, `$effect`) gave it an
explicit, signals-based reactivity model that reads closer to Vue than to
React's render-and-reconcile. The payoff is real: smaller bundles, less
boilerplate for simple reactive state. The cost is a second component
language and toolchain to onboard a team into, and a smaller hiring pool
than React's.

**Nuxt.** Vue's answer to Next.js — file-based routing, server routes under
`server/api/`, auto-imports for composables — built on Nitro, which is also
what gives it one of the broadest deploy-anywhere adapter stories in this
list. If your team is already Vue, or your product embeds in a Vue-heavy
org, Nuxt removes the "which meta-framework" question by removing the
"which base framework" question first.

**Astro, as content-first rather than app-first.** Astro's default is zero
client JS; islands opt in per component, and those islands can be React,
Vue, Svelte, or Solid on the same page, each hydrating independently. It is
the right default for a marketing site, docs, or blog with a handful of
interactive widgets, and the wrong default for an app that's interactive on
nearly every route — you'd be fighting the framework's core bet the whole
time.

**SolidStart.** Solid's fine-grained reactivity (no virtual DOM, components
run once and only the reactive parts of the DOM update) gives it some of the
best raw runtime performance numbers in any framework benchmark, and
SolidStart wraps it in a meta-framework with SSR, streaming, and file-based
routing. The tradeoff is ecosystem size: fewer libraries, fewer Stack
Overflow answers, a real cost if your team hits an unusual problem.

**Qwik.** Built entirely around resumability — a server-rendered page ships
serialized state instead of re-executing component code to hydrate, so
"hydration" in the CSR/SSR sense mostly doesn't apply — which makes it worth
knowing conceptually even if you never ship it: it's proof that "the client
must re-run everything the server ran" isn't a law of nature, just how most
frameworks currently do it.

## Further reading (optional)

- [Next.js 16 release notes](https://nextjs.org/blog/next-16)
- [TanStack Start v1 Release Candidate](https://tanstack.com/blog/announcing-tanstack-start-v1)
- [State of JavaScript 2025: Meta-Frameworks](https://2025.stateofjs.com/en-US/libraries/meta-frameworks/)
- [Remix: Wake up, Remix](https://remix.run/blog/wake-up-remix)
- [Svelte 5 runes documentation](https://svelte.dev/docs/svelte/what-are-runes)
