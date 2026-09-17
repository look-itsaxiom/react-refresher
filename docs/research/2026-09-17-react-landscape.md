# The React Landscape, September 2026

*Research date: 2026-09-17. Audience: an experienced developer whose last serious React work was on React 18. Versions below were checked against the npm registry on the research date unless stated otherwise. Where a claim could not be verified from a primary source, it is marked as such.*

---

## 1. React core

### Current stable version

**React 19.3.0**, released **September 9, 2026** ([react.dev/versions](https://react.dev/versions), [19.3 blog post](https://react.dev/blog/2026/09/09/react-19-3)). There is no React 20 announced or in canary. The 19.0.x, 19.1.x, and 19.2.x lines still receive patch releases (latest patches landed June 2026). The `canary` and `experimental` npm tags track 19.3-canary builds.

Governance changed too: on **February 24, 2026** React, React Native, and JSX moved from Meta to the **React Foundation**, hosted by the Linux Foundation, with Amazon, Callstack, Expo, Huawei, Meta, Microsoft, Software Mansion, and Vercel as platinum members ([react.dev](https://react.dev/blog/2026/02/24/the-react-foundation), [Linux Foundation press release](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-react-foundation)).

### React 19.0 (December 5, 2024)

Source: [React v19 blog post](https://react.dev/blog/2024/12/05/react-19).

- **Actions**: async functions inside transitions. React manages pending state, errors, optimistic updates, and form reset.
- **`useActionState(action, initialState)`** returns `[state, submitAction, isPending]`. Replaces the short-lived `ReactDOM.useFormState`.
- **`useFormStatus()`** reads the parent `<form>`'s pending state without prop drilling.
- **`useOptimistic(value)`** shows an optimistic value while an action runs, then reverts or settles.
- **`use(resource)`**: read a promise or a Context during render. Can be called conditionally and after early returns, unlike hooks. Promises must be created outside render or come from a Suspense-aware cache.
- **`<form action={fn}>`** and `formAction` on buttons accept functions.
- **`ref` as a regular prop** on function components. `forwardRef` is deprecated and a codemod exists.
- **Ref callback cleanup functions**: return a function from a ref callback and React calls it on unmount instead of calling the ref with `null`.
- **`<Context value={...}>`** renders as its own provider. `<Context.Provider>` is deprecated.
- **`useDeferredValue(value, initialValue)`** accepts an initial value.
- **Document metadata**: `<title>`, `<meta>`, and `<link>` rendered anywhere are hoisted into `<head>`.
- **Stylesheets with `precedence`**, async `<script>` deduplication, and `preload`/`preinit`/`preconnect`/`prefetchDNS` from `react-dom`.
- **Server Components** stable for bundlers and frameworks to build on. **Server Functions** (`"use server"`) let clients call server code. Still bundler-dependent, so you use them through Next.js, React Router, Parcel, or a Vite RSC plugin, not bare React.
- **`react-dom/static`**: `prerender` and `prerenderToNodeStream`.
- **Hydration errors** now print a diff of server vs client output. Hydration also tolerates extra tags injected into `<head>` and `<body>` by extensions.
- **Root error hooks**: `onCaughtError`, `onUncaughtError`, `onRecoverableError` on `createRoot`.
- **Custom elements** fully supported.
- **Removed**: `propTypes`, `defaultProps` on function components, string refs, legacy Context, `ReactDOM.render`, `ReactDOM.hydrate`, `unmountComponentAtNode`, `findDOMNode`, `react-test-renderer/shallow`. `react-test-renderer` itself is deprecated.

### React 19.1 (March 2025)

Smaller release. Its headline was **Owner Stacks** (`captureOwnerStack`, dev-only) for better error attribution, plus Suspense and hydration refinements. Not verified against the 19.1 post in this research pass; treat as secondary.

### React 19.2 (October 1, 2025)

Source: [React 19.2 blog post](https://react.dev/blog/2025/10/01/react-19-2).

- **`<Activity mode="visible" | "hidden">`** (stable): hides a subtree with `display: none`, preserves its state, unmounts its effects, and defers its updates to lowest priority. Use it for tabs, back/forward cache-style UI, and pre-rendering the next likely screen.
- **`useEffectEvent`** (stable): declare a non-reactive "event" function that always sees latest props and state, callable from effects without being a dependency.
- **`cacheSignal`**: an `AbortSignal` tied to `cache()` lifetime. Server Components only.
- **React Performance Tracks** in Chrome DevTools: scheduler lanes and component render/effect timings.
- **Partial Pre-rendering** APIs: `prerender` to a static shell, then `resume` / `resumeToPipeableStream` / `resumeAndPrerender` for the dynamic remainder. This is what Next.js Cache Components sit on.
- **Batched Suspense reveals** during SSR streaming, to avoid staggered pop-in.
- `useId` prefix changed from `:r:` to `_r_` so ids work as CSS selectors and view-transition names.
- `eslint-plugin-react-hooks` v6 moved to flat config by default.
- `renderToReadableStream` (Web Streams) now works on Node.

### React 19.3 (September 9, 2026)

Source: [React 19.3 blog post](https://react.dev/blog/2026/09/09/react-19-3).

- **`<ViewTransition>`** graduated to stable. Wraps the browser View Transition API. Animates `enter`, `exit`, `update`, and `share` (named element moving between positions) whenever the change happens inside a Transition, a Suspense reveal, or a `useDeferredValue` update. Urgent updates do not animate. **`addTransitionType('next')`** inside `startTransition` lets you pick direction-specific animations. Images and fonts inside a `ViewTransition` + `Suspense` are awaited to prevent flicker. DOM only for now.
- **Fragment refs**: `<Fragment ref={...}>` gives a `FragmentInstance` with `focus()`, `addEventListener`, `observeUsing(IntersectionObserver)`, `getClientRects()`, `scrollIntoView()` and so on, operating on the group of children without a wrapper element.
- **`browser()`** from `react-dom`: `use(browser())` suspends on the server only, giving a first-class "client-only" escape hatch that renders the nearest Suspense fallback in the HTML.
- **Trusted Types** pass through without string coercion, so strict `require-trusted-types-for 'script'` CSPs now work.
- **Server Components can render `<Context value>` imported from a `'use client'` module directly**, without a wrapper Provider component.
- `onBrowserBailout` option on `react-dom/server` APIs.
- **Transitions render independently**: one slow transition no longer holds up unrelated ones.
- Many Activity, ViewTransition, and Fast Refresh bug fixes; `onFullscreenChange` events; `submitter` on submit events.

### What is stable vs experimental, as of 19.3

| API | Status |
|---|---|
| Actions, `use`, `useActionState`, `useFormStatus`, `useOptimistic` | Stable (19.0) |
| Server Components, Server Functions | Stable semantics (19.0), framework/bundler required |
| `<Activity>` | Stable (19.2) |
| `useEffectEvent` | Stable (19.2) |
| `<ViewTransition>`, `addTransitionType` | Stable (19.3) |
| Fragment refs, `browser()` | Stable (19.3) |
| `cacheSignal`, `cache()` | Server Components only |
| `SuspenseList`, taint APIs, `unstable_*` | Still canary/experimental (not in any stable release notes found) |

**Security note**: in December 2025 an unauthenticated RCE (CVE-2025-66478) and two follow-up issues were disclosed in React Server Components. Anything running RSC must be on 19.0.1+, 19.1.2+, or 19.2.1+ ([advisory](https://react.dev/blog)).

---

## 2. React Compiler

**Status: stable. v1.0.0 shipped October 7, 2025** ([blog](https://react.dev/blog/2025/10/07/react-compiler-1)). npm `babel-plugin-react-compiler@latest` is still `1.0.0` on the research date; there is an `experimental` tag with newer builds.

**What it does**: a Babel plugin that analyzes data flow and mutability and inserts fine-grained memoization at build time, including in places manual `useMemo` cannot reach (after conditional returns, for example). Meta reports up to 12% faster loads and some interactions 2.5x faster with neutral memory.

**Implications for `useMemo` / `useCallback` / `memo`**: stop writing them by default in compiled code. Keep them as an escape hatch when you need guaranteed identity (for example a memoized value used as an effect dependency). Existing manual memoization can stay; removing it can change compiler output, so remove with tests. The compiler only optimizes components that follow the Rules of React, and it silently skips ones that do not.

**Lint**: `eslint-plugin-react-hooks` 7.x (currently 7.1.1) ships compiler-powered rules in `recommended`: `set-state-in-effect`, `refs` (no `ref.current` during render), `globals`, `purity`, `immutability`, and more. You can adopt the lint rules before adopting the compiler.

**How to enable**:

```bash
npm i -D -E babel-plugin-react-compiler@latest
```

- **Next.js 16**: `reactCompiler: true` in `next.config.ts`. Stable but off by default because it runs through Babel and slows builds. Next 16.3 ships an experimental Rust port inside Turbopack.
- **Vite**: pass the plugin through `@vitejs/plugin-react`'s `babel.plugins`, or start from `create-vite`'s compiler template.
- **Expo**: on by default since SDK 54.
- **React 17/18**: supported with the `react-compiler-runtime` package and a `target` option.

---

## 3. Frameworks and meta-frameworks

### Next.js 16.3 (current npm: 16.3.5)

Release train: 16.0 on October 21, 2025; 16.1 on December 18, 2025; 16.2 on March 18, 2026; 16.3 on August 3, 2026 ([nextjs.org/blog](https://nextjs.org/blog), [Next.js 16 post](https://nextjs.org/blog/next-16)).

- **Turbopack is the default bundler** for dev and production. Webpack is opt-out via `--webpack`. Filesystem caching stable in 16.1.
- **Cache Components** replace the App Router's implicit caching. With `cacheComponents: true`, everything is dynamic at request time and you opt in with the `"use cache"` directive on pages, components, or functions. Cache keys are compiler-generated. `revalidateTag(tag, profile)` now takes a `cacheLife` profile; new `updateTag()` (read-your-writes) and `refresh()` are Server-Action-only. The old `experimental.ppr` and `dynamicIO` flags are gone. Partial Prerendering is the underlying model.
- **`proxy.ts` replaces `middleware.ts`** and runs on Node. `middleware.ts` is deprecated.
- **Breaking in 16**: `params`, `searchParams`, `cookies()`, `headers()` must be awaited; `next lint` removed; AMP removed; Node 20.9+ and TypeScript 5.1+ required; parallel routes need explicit `default.js`.
- **16.2**: roughly 4x faster dev startup, agent-oriented tooling (browser log forwarding, MCP devtools).
- **16.3 "Instant Navigations"**: per-link `Stream`, `Cache`, or `Block` navigation modes and Partial Prefetching (a cached per-route shell rendered instantly while the rest streams), enabled with `cacheComponents` and `partialPrefetching` flags. Docs bundled as `AGENTS.md`; `import.meta.glob` support in Turbopack.
- **Security**: multiple critical security releases through 2025 and 2026 (December 2025, May, July, August 2026). Stay on the latest patch.

### React Router 8 (current npm: 8.4.0)

React Router v7 (November 2024) absorbed Remix v2 as **framework mode**: Vite plugin, loaders/actions, SSR, code splitting, typegen ([remix.run](https://remix.run/blog/react-router-v7)). It also works as a plain library router (v6-style) or in "data mode".

**v8.0.0 shipped June 17, 2026** ([changelog](https://reactrouter.com/changelog)): Node 22.22+, React 19.2.7+, Vite 7+, ESM-only; `react-router-dom` package removed (import from `react-router` and `react-router/dom`); middleware always on; `splitRouteModules` top-level. **RSC framework mode remains unstable** in 8.4 and is not recommended for production.

**Remix 3** (announced May 2025, "Wake up, Remix!") is a separate, non-React framework and still in beta. If someone says "Remix" in 2026 they usually mean React Router framework mode.

### TanStack Start (current npm: `@tanstack/react-start` 1.168.56)

Full-stack framework on TanStack Router (1.170.x): SSR, streaming, type-safe server functions, Vite or Rsbuild builds, deploys anywhere. It reached **v1 Release Candidate on September 22, 2025** ([blog](https://tanstack.com/blog/announcing-tanstack-start-v1)) and publishes 1.x versions on npm, but the docs overview still carries the "Release Candidate" label on the research date; no "1.0 stable" blog post exists. Treat the API as stable and the label as lagging. RSC support is optional and experimental. In July 2026 TanStack published "We Stopped Using RSC on TanStack.com", arguing lightweight SSR beat RSC for their content site while keeping RSC as an opt-in primitive in Start ([post](https://tanstack.com/blog/we-stopped-using-rsc-on-tanstack-com)). TanStack announced hosting partnerships with Vercel and Render in September 2026.

### Vite and SPA tooling

- **Create React App was sunset on February 14, 2025** ([react.dev](https://react.dev/blog/2025/02/14/sunsetting-create-react-app)). The React team recommends a framework, or Vite / Parcel / Rsbuild for a plain SPA.
- **Vite 8.0 shipped March 12, 2026** with **Rolldown** (Rust) replacing both esbuild and Rollup ([announcement](https://vite.dev/blog/announcing-vite8)). Rolldown 1.0 stable followed on May 7, 2026. Current npm is Vite 8.3.0. Most Rollup plugins work unchanged.
- **`@vitejs/plugin-react` 6.x** and **`@vitejs/plugin-rsc` 0.5.x**, the official low-level RSC plugin for Vite, exist for people who want RSC without a framework. React Router's RSC mode builds on it.

### Astro (current npm: 7.3.3)

Astro 6 (February 10, 2026) stabilized Server Islands; Astro 7 (June 22, 2026) rewrote the compiler in Rust and moved to Vite 8, claiming 15 to 61% faster builds ([astro.build/blog/astro-7](https://astro.build/blog/astro-7/)). React islands (`client:load`, `client:visible`, and so on) remain the standard way to sprinkle React into a content site.

### React Native and Expo

React Native latest is 0.87.1; the legacy architecture was removed in 0.82 (October 2025), so **New Architecture only**. Expo SDK 57 (mid-2026) ships RN 0.86 and React 19.2 as a deliberately low-risk upgrade; SDK 56 (May 21, 2026) shipped RN 0.85 ([Expo changelog](https://expo.dev/changelog/sdk-57)). Expo enables React Compiler by default since SDK 54. Hermes V1 is the experimental next-gen engine.

---

## 4. State management

npm on the research date: Zustand 5.0.15, Jotai 3.0.0 (September 8, 2026, ESM-only, no API changes), Redux Toolkit 2.12.0, XState 5.33 (v6 in alpha), Valtio 2.3.2, TanStack Query 5.103.

State of React 2025 (3,760 respondents, fielded November 2025 to January 2026, [results](https://2025.stateofreact.com/en-US/libraries/)): Zustand crossed 50% usage (28% in 2023), Redux Toolkit flat around 54%, Jotai up to 19%, and 34% use no state library at all. Zustand weekly downloads now exceed Redux Toolkit's per several 2026 trackers.

The consensus split in 2026:

1. **Server state belongs in TanStack Query (or RTK Query)**, not a global store. Most "global state" people used to put in Redux is cache.
2. **Client state**: Zustand is the default for small-to-medium stores (no Provider, selectors, middleware). Jotai when the state is naturally atomic and derived. Redux Toolkit when you want its devtools, entity adapters, and structure on a large long-lived app. XState for genuinely stateful workflows. Valtio is niche.
3. **URL state** is first-class in TanStack Router / React Router with typed search params.
4. **Context** stays for provider-shaped, rarely changing values (theme, auth session). Context is not a state manager; splitting contexts and `useSyncExternalStore` are still the fixes for re-render storms.
5. **Server Components** shift some state to the server entirely: in Next.js and React Router framework mode, the data layer often needs no client store at all.

---

## 5. Data fetching

- **TanStack Query v5** (React package still 5.x; the v6 rewrite so far exists only for Solid). `useSuspenseQuery`, `useSuspenseInfiniteQuery`, and `useSuspenseQueries` are the stable Suspense path with non-optional `data`. `useQuery().promise` plus `use()` is offered for React 19 integration but flagged experimental ([docs](https://tanstack.com/query/v5/docs/framework/react/guides/suspense)). Object-only signatures, `isPending` replaced `isLoading` for initial state, `gcTime` replaced `cacheTime`.
- **SWR 2.5** is maintained but flat; it lost mindshare to TanStack Query and to RSC.
- **RSC data fetching**: `async` Server Components await data directly. Client components receive promises as props and read them with `use(promise)` inside Suspense. React 19.3's `use(browser())` handles the client-only case.
- **Server Functions** (`"use server"`) replace hand-rolled mutation endpoints in RSC frameworks; combine with `useActionState` and `useOptimistic`.
- Rule of thumb: `use()` for promises the framework or a cache created; a query library for anything you refetch, paginate, or invalidate on the client.

---

## 6. Styling and component libraries

- **Tailwind CSS 4.x** (4.0 January 2025; 4.3 June 12, 2026; npm 4.3.3). CSS-first config via `@theme` in your stylesheet, no `tailwind.config.js`, OKLCH colors, Rust-backed Oxide engine, Vite plugin. 4.3 added scrollbar utilities and logical properties ([tailwindcss.com/blog](https://tailwindcss.com/blog)).
- **CSS Modules** are the boring default in RSC-friendly setups and Vite.
- **Runtime CSS-in-JS declined**. styled-components is in maintenance mode (npm 6.5.3, with a 6.3 release in January 2026 that added RSC compatibility); Emotion 11.14 is similar. Both fight streaming SSR and Server Components. **Zero-runtime** options grew: Panda CSS 1.12 (v2 in beta), vanilla-extract 1.21, StyleX.
- **shadcn/ui**: in **July 2026 Base UI became the default primitive** for new projects, replacing Radix, after users picked it 2:1 ([changelog](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default)). Radix stays fully supported. The same month **React Aria Components** became a third option via `--base aria`.
- **Base UI** (MUI team, includes ex-Radix and Floating UI authors) shipped **1.0 on December 11, 2025** and renamed to `@base-ui/react`; 1.8.x is in the wild. 35+ unstyled accessible components.
- **Radix UI** primitives at 1.1.x, maintained but slow.
- **Ark UI** 5.39 (Chakra team, Zag.js state machines, React/Vue/Solid/Svelte). **react-aria-components** 1.21.
- Chakra UI v3, Mantine, and MUI continue as styled kits; MUI now builds on Base UI.

---

## 7. Forms and validation

- **React 19 Actions** cover simple forms with zero libraries: `<form action={fn}>`, `useActionState` for state and pending, `useFormStatus` in submit buttons, `useOptimistic` for optimistic UI. Progressive enhancement works in RSC frameworks.
- **react-hook-form 7.88** remains the most used library; v8 is in beta. Pairs with Zod via `@hookform/resolvers`.
- **TanStack Form 1.x** (npm 1.33.5) is the strong typed alternative; it consumes **Standard Schema** directly so no adapter packages. **Form v2 alpha** announced August 6, 2026 with schema-oriented forms and simpler SSR ([blog](https://tanstack.com/blog)).
- **Conform** targets React Router / Remix progressive-enhancement forms.
- **Validation**: Zod 4 (mid-2025 rewrite, npm 4.6.5) is the default with roughly 31M weekly downloads and a tree-shakable `zod/mini`; Valibot 1.5 for smallest bundles; ArkType 2.2 for speed. All three implement the **Standard Schema** spec, so libraries accept any of them interchangeably.

---

## 8. Testing

- **Vitest** is the default runner. Vitest 4 (October 22, 2025) made Browser Mode stable with visual regression and Playwright traces; **Vitest 5.0 shipped September 3, 2026** (npm 5.0.1) focused on performance and a stable on-disk module cache ([announcement](https://vitest.dev/blog/vitest-5.html)). State of JS 2025 put Vitest at 52% usage. Jest is legacy.
- **React Testing Library 16.3** still the component-testing idiom; it requires `@testing-library/dom` as a peer.
- **Playwright 1.63** for end-to-end and, increasingly, for real-browser component tests via Vitest Browser Mode.
- **Storybook 10** (October/November 2025, npm 10.6.0) is ESM-only, integrates Vitest 4, supports Next 16, adds `.test` on stories, and has experimental RSC testing. Storybook 11 is in alpha with CSF Factories planned as default ([storybook.js.org/blog/storybook-10](https://storybook.js.org/blog/storybook-10/)).
- **MSW 2.15** for network mocking with Fetch-standard `Request`/`Response` handlers.

---

## 9. TypeScript-React idioms in 2026

- **TypeScript 7.0.2** is current (GA July 8, 2026), the Go-native compiler formerly known as `tsgo`, roughly 10x faster type-checking ([InfoQ](https://www.infoq.com/news/2026/08/typescript-7-released/)). **TypeScript 6.0** (March 2026) was the last JavaScript-based release and the bridge: it flipped `strict`, ESM, and `es2025` defaults and deprecated `moduleResolution: node` and `target: es5`. Some tooling (ESLint type-aware rules, some plugins) lagged on 7.0 support.
- **Props**: plain `function Component({ a, b }: Props)` with an explicit interface. `React.FC` is neither banned nor recommended; the debate ended when it stopped implying `children`. Most style guides skip it.
- **`ComponentProps<'button'>`** and `ComponentPropsWithoutRef` to extend native elements. `ref` is now a normal prop, so `forwardRef` and `ElementRef` gymnastics disappear.
- **Discriminated unions** for mutually exclusive prop sets and for async state (`{status: 'loading'} | {status: 'error', error} | {status: 'success', data}`).
- **`satisfies`** for config objects and route tables to keep literal inference while checking shape.
- `import type`, `noUncheckedIndexedAccess`, no `any`, `as const` for enums, and explicit return types on exported functions.
- Framework typegen (React Router `Route.LoaderArgs`, TanStack Router typed params and search) means fewer hand-written types.

---

## 10. Tooling

- **Linting and formatting**: ESLint 10 is flat-config only. **Biome 2.x** (npm 2.5.14) is a single Rust binary that lints and formats with its own approximate type inference. **oxlint 1.83** (plus `oxfmt`) is the fastest linter and gained true type-aware rules via tsgo in 2026. typescript-eslint remains the only fully mature type-aware option ([comparison](https://jsmanifest.com/biome-oxlint-comparison-2026)). Next.js 16 dropped `next lint` and suggests Biome or ESLint directly.
- **Bundlers**: Vite 8 on Rolldown; Turbopack in Next.js; Rsbuild as the webpack-compatible alternative. Webpack is legacy for new work.
- **Package managers**: pnpm 11 (April 28, 2026) added ESM-only distribution and `minimumReleaseAge: 1 day` by default after the late-2025 Shai-Hulud npm supply-chain attacks; **pnpm 12 (August 26, 2026) is a Rust rewrite**, npm 12.4.2 ([pnpm.io/blog](https://pnpm.io/blog)). pnpm is the de facto default for new React monorepos; Bun is at roughly 21% usage per State of JS 2025.
- **Node**: Node 24 is Active LTS; Node 26 (May 2026) becomes LTS in October 2026; from Node 27 there is one major per year. Next.js 16 needs 20.9+, React Router 8 needs 22.22+, pnpm 11+ needs 22. Native type-stripping means `.ts` config files run without a loader.
- **React DevTools** gained Performance Tracks (19.2) and Next.js and Astro both ship agent-facing devtools (MCP servers, JSON logs).

---

## 11. Senior-level concepts that still matter

1. **Reconciliation and keys**: keys identify instances across renders; stable unique keys, never index for reorderable lists; changing a key remounts.
2. **Automatic batching** (React 18) applies everywhere, including promises and timeouts; `flushSync` is the escape hatch.
3. **Concurrent rendering**: rendering is interruptible; components must be pure and idempotent; `StrictMode` double-invokes to catch impurity (and since 19.3 does so during hydration too).
4. **Transitions**: `startTransition` / `useTransition` mark non-urgent updates; in 19 they accept async functions (Actions); in 19.3 they animate via `ViewTransition` and render independently.
5. **Suspense boundaries**: placement determines loading granularity and streaming chunks; a boundary with `ViewTransition` around it animates the reveal.
6. **Error boundaries**: still class components (or `react-error-boundary`); pair with `onCaughtError`/`onUncaughtError` root options.
7. **Portals**, **refs** (now props, with cleanup), **Fragment refs** for grouping.
8. **Custom hooks** as the unit of reuse; `useEffectEvent` for the "latest callback" problem; `useSyncExternalStore` for subscribing to external stores without tearing.
9. **"You might not need an Effect"**: derive during render, compute in event handlers, use Actions for mutations; the `set-state-in-effect` lint rule now enforces this.
10. **Performance profiling**: React Profiler, Performance Tracks, and the question "did the compiler skip this component, and why?"
11. **Server vs client boundary**: what `'use client'` means (an entry point into the client bundle, not "runs only on client"), what can cross it (serializable props, promises, Server Functions), and why Context needs a client module.
12. **Hydration**: mismatch diffs, `suppressHydrationWarning`, and `browser()` for legitimately client-only output.

---

## 12. What a React-18-era developer most likely does not know, ranked

1. **Actions and the form hooks** (`useActionState`, `useFormStatus`, `useOptimistic`, `<form action>`). They change how mutations are written everywhere, including SPAs.
2. **The `use` API** for promises and Context, and how Suspense-based data fetching actually works in 19.
3. **Server Components and Server Functions**, the `'use client'` boundary, and how Next.js 16 (Cache Components, `"use cache"`) and React Router 8 framework mode expose them. Even if you never write an RSC, you will read them.
4. **React Compiler**: install it, stop hand-memoizing, read the lint output.
5. **`ref` as a prop and ref cleanup**, `<Context value>`, and the deleted APIs (`forwardRef` deprecated, `propTypes`, `defaultProps`, string refs).
6. **`<Activity>`, `useEffectEvent`, `<ViewTransition>`**: the three new primitives from 19.2 and 19.3.
7. **The framework landscape**: CRA is dead; Vite 8 for SPAs; Next.js versus React Router 8 versus TanStack Start; Astro for content.
8. **Server-state-in-TanStack-Query, client-state-in-Zustand** as the default split, with Redux as an explicit choice rather than a default.
9. **Tailwind v4 CSS-first config and shadcn/ui on Base UI**, plus why runtime CSS-in-JS lost.
10. **Vitest 5 with Browser Mode, Playwright, Storybook 10**, and MSW 2.
11. **TypeScript 7, Standard Schema, Zod 4**, and the Rust toolchain (Rolldown, oxlint or Biome, pnpm 12).
12. **Governance and security hygiene**: the React Foundation, the December 2025 RSC RCE, and pnpm's release-age quarantine.

---

## Unverified or uncertain items

- React 19.1's exact feature list was not re-read from the primary post.
- TanStack Start is labeled "Release Candidate" in docs while shipping 1.168.x on npm; no formal 1.0 stable announcement was found.
- Storybook 10.0's exact ship date (October vs early November 2025) differs between sources.
- Expo SDK 57's React Native version (0.86) comes from a secondary source; React Native itself is at 0.87.1 on npm.
- Download-count comparisons (Zustand vs Redux Toolkit, Zod weekly downloads) are from third-party trackers, not npm directly.

## Primary sources

- React blog and versions: https://react.dev/blog, https://react.dev/versions, https://react.dev/blog/2026/09/09/react-19-3, https://react.dev/blog/2025/10/01/react-19-2, https://react.dev/blog/2024/12/05/react-19, https://react.dev/blog/2025/10/07/react-compiler-1, https://react.dev/blog/2026/02/24/the-react-foundation, https://react.dev/blog/2025/02/14/sunsetting-create-react-app
- Next.js: https://nextjs.org/blog, https://nextjs.org/blog/next-16, https://nextjs.org/blog/next-16-3
- React Router: https://reactrouter.com/changelog, https://remix.run/blog/react-router-v7, https://remix.run/blog/wake-up-remix
- TanStack: https://tanstack.com/blog, https://tanstack.com/blog/announcing-tanstack-start-v1, https://tanstack.com/blog/we-stopped-using-rsc-on-tanstack-com, https://tanstack.com/query/v5/docs/framework/react/guides/suspense
- Vite / Vitest: https://vite.dev/blog/announcing-vite8, https://vitest.dev/blog/vitest-4, https://vitest.dev/blog/vitest-5.html
- Astro: https://astro.build/blog/astro-7/
- Expo: https://expo.dev/changelog/sdk-57, https://expo.dev/changelog/sdk-56
- shadcn/ui: https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default, https://ui.shadcn.com/docs/changelog/2026-07-react-aria
- Base UI: https://github.com/mui/base-ui/releases/tag/v1.0.0
- Tailwind: https://tailwindcss.com/blog/tailwindcss-v4-3
- Storybook: https://storybook.js.org/blog/storybook-10/
- TypeScript: https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/, https://www.infoq.com/news/2026/08/typescript-7-released/
- pnpm: https://pnpm.io/blog/releases/11.0
- Node: https://nodejs.org/en/blog/announcements/evolving-the-nodejs-release-schedule
- Surveys: https://2025.stateofreact.com/en-US/libraries/, https://2025.stateofjs.com/en-US/libraries/build-tools/
- Linting comparison: https://jsmanifest.com/biome-oxlint-comparison-2026
- npm registry (`npm view <pkg> version time.modified dist-tags`) for all "current npm" versions, queried 2026-09-17.
