import type { PlannedLesson, Track } from './types';

/**
 * Tracks appear on the dashboard in this order. The first six are the React path;
 * the rest cover the wider frontend map (structured after roadmap.sh/frontend, 2026 edition).
 */
export const tracks: Track[] = [
  { id: 'refresher', title: 'Refresher', description: 'The fundamentals, re-explained the way React 19 thinks about them.' },
  { id: 'react18', title: 'React 18 features you skipped', description: 'Concurrent rendering, Suspense, transitions, and the hooks that came with them.' },
  { id: 'react19', title: 'React 19', description: 'Actions, use(), useOptimistic, ref as a prop, metadata, and what got removed.' },
  { id: 'compiler', title: 'Compiler-era patterns', description: 'What the React Compiler does for you and how to write code it can optimize.' },
  { id: 'ecosystem', title: 'React ecosystem 2026', description: 'Data fetching, state, forms, styling, and TypeScript idioms as actually used today.' },
  { id: 'server', title: 'Server-side React', description: 'Server Components and Server Functions: taught and simulated, not executed.' },
  { id: 'web-platform', title: 'Web platform essentials', description: 'How the browser, HTTP, HTML, modern CSS, and the newer Web APIs actually work.' },
  { id: 'javascript-typescript', title: 'JavaScript and TypeScript, current', description: 'The language features and type-level tools that changed since you last looked.' },
  { id: 'tooling', title: 'Package managers, bundlers, linters', description: 'pnpm, Vite and Rolldown, Biome and oxlint, monorepos: the build chain demystified.' },
  { id: 'testing', title: 'Testing', description: 'Vitest, Testing Library, Playwright, MSW, Storybook: a strategy, not a pile of tools.' },
  { id: 'rendering', title: 'Rendering strategies', description: 'CSR, SSR, SSG, ISR, streaming, islands, and hydration, and which framework does what.' },
  { id: 'performance', title: 'Performance optimization', description: 'Core Web Vitals, loading, caching, runtime, and React-specific performance work.' },
  { id: 'accessibility', title: 'Accessibility', description: 'WCAG, semantics, ARIA, keyboard and focus, screen readers, and testing for a11y.' },
  { id: 'security', title: 'Frontend web security', description: 'XSS, CSP, CORS, CSRF, supply chain, and the headers and habits that prevent them.' },
  { id: 'auth', title: 'Auth strategies', description: 'Sessions, JWTs, OAuth and OIDC, passkeys, SSO, and how a React app should hold credentials.' },
  { id: 'graphql', title: 'GraphQL', description: 'Schemas, operations, clients and caches, codegen, and when GraphQL beats REST or tRPC.' },
  { id: 'web-components', title: 'Web Components', description: 'Custom elements, Shadow DOM, templates and slots, Lit, and interop with React 19.' },
  { id: 'pwa', title: 'PWAs, mobile, and desktop', description: 'Service workers, offline, install, and shipping the same code to phones and desktops.' },
  { id: 'deployment', title: 'Deployment and CI/CD', description: 'Static hosts, CDNs, edge and serverless, containers, GitHub Actions, and release safety.' },
  { id: 'design-systems', title: 'Design systems and CSS architecture', description: 'Tokens, theming, component libraries, Storybook, and CSS that scales.' },
  { id: 'ai-assisted', title: 'AI-assisted development', description: 'Agents, MCP, prompting, code review with AI, and building LLM features into a frontend.' },
  { id: 'go', title: 'Go for the backend', description: 'Go for TypeScript developers: HTTP services, service patterns, and integrations, graded by go test on your machine.' },
  { id: 'postgres', title: 'PostgreSQL in practice', description: 'Schema design, queries, indexes, and migrations for cross-organization project data, run on Postgres in the browser.' },
  { id: 'interview', title: 'Interview practice', description: 'System design, timed live-coding drills, a take-home rehearsal, and product thinking for a small full-stack team.' },
];

/** Ordered. Ids with a matching folder under ./lessons are playable; the rest render as locked. */
export const curriculum: PlannedLesson[] = [
  // ---- Refresher
  { id: '01-rendering-and-state', track: 'refresher', title: 'Rendering and state', summary: 'Trigger, render, commit. State as a snapshot. Batching and updater functions.' },
  { id: '04-effects-and-refs', track: 'refresher', title: 'You might not need an effect', summary: 'What effects are for, what they are not for, refs, and cleanup.' },
  { id: '05-context-and-composition', track: 'refresher', title: 'Context and composition', summary: 'Lifting state, children as data, context without prop drilling pain.' },
  { id: '06-custom-hooks', track: 'refresher', title: 'Custom hooks', summary: 'Extracting logic, stable identities, and the rules of hooks.' },
  { id: '07-lists-keys-forms', track: 'refresher', title: 'Lists, keys, and controlled inputs', summary: 'Identity, reconciliation, and forms before Actions.' },
  // ---- React 18
  { id: '02-suspense-and-transitions', track: 'react18', title: 'Suspense and transitions', summary: 'Loading boundaries, startTransition, useTransition, useDeferredValue.' },
  { id: '08-concurrent-rendering', track: 'react18', title: 'Concurrent rendering mental model', summary: 'Interruptible rendering, priorities, and what StrictMode double-invokes.' },
  { id: '09-external-stores', track: 'react18', title: 'useSyncExternalStore and useId', summary: 'Subscribing to things outside React without tearing.' },
  // ---- React 19
  { id: '03-actions-and-optimistic-ui', track: 'react19', title: 'Actions and optimistic UI', summary: 'useActionState, useFormStatus, form actions, useOptimistic.' },
  { id: '10-use-and-ref-changes', track: 'react19', title: 'use(), ref as a prop, ref cleanup', summary: 'Reading promises and context with use(); forwardRef is over.' },
  { id: '11-metadata-and-resources', track: 'react19', title: 'Document metadata and resource hints', summary: 'title/meta/link in components, stylesheet precedence, preload APIs.' },
  { id: '12-react-19-removals', track: 'react19', title: 'What React 19 removed', summary: 'propTypes, string refs, legacy context, ReactDOM.render, and how to migrate.' },
  { id: '24-activity-effect-events-view-transitions', track: 'react19', title: 'Activity, useEffectEvent, ViewTransition', summary: 'The 19.2 and 19.3 primitives: hide-but-keep-state, non-reactive effect logic, animated transitions.' },
  // ---- Compiler
  { id: '13-what-the-compiler-does', track: 'compiler', title: 'What the React Compiler does', summary: 'Automatic memoization, the rules it relies on, and reading its output.' },
  { id: '14-compiler-friendly-code', track: 'compiler', title: 'Writing compiler-friendly code', summary: 'Purity, mutation, and when useMemo/useCallback still matter.' },
  // ---- Ecosystem
  { id: '15-server-state-tanstack-query', track: 'ecosystem', title: 'Server state with TanStack Query', summary: 'Queries, mutations, invalidation, and why useEffect fetching is gone.' },
  { id: '16-client-state-zustand', track: 'ecosystem', title: 'Client state with Zustand and friends', summary: 'Stores without boilerplate; when context is enough.' },
  { id: '17-forms-and-validation', track: 'ecosystem', title: 'Forms and validation', summary: 'Actions vs react-hook-form vs TanStack Form; Zod and Standard Schema.' },
  { id: '18-styling-in-2026', track: 'ecosystem', title: 'Styling in 2026', summary: 'Tailwind v4, CSS Modules, and why runtime CSS-in-JS faded.' },
  { id: '20-typescript-react-idioms', track: 'ecosystem', title: 'TypeScript and React idioms', summary: 'ComponentProps, discriminated props, satisfies, no more React.FC debates.' },
  // ---- Server-side React
  { id: '21-server-components', track: 'server', title: 'Server Components', summary: 'The client/server boundary, "use client", serialization rules.' },
  { id: '22-server-functions', track: 'server', title: 'Server Functions', summary: '"use server", calling the server from forms and events, revalidation.' },
  { id: '23-frameworks', track: 'server', title: 'Next.js, React Router framework mode, TanStack Start', summary: 'How the frameworks package RSC and where they differ.' },
  // ---- Web platform essentials
  { id: '25-how-the-web-works', track: 'web-platform', title: 'How the web works, revisited', summary: 'DNS, TLS, HTTP/1.1 vs 2 vs 3, hosting, and what happens between typing a URL and first paint.' },
  { id: '26-how-browsers-render', track: 'web-platform', title: 'How browsers render', summary: 'Parsing, the render tree, layout, paint, compositing, and the event loop.' },
  { id: '27-html-that-matters', track: 'web-platform', title: 'HTML that matters in 2026', summary: 'Semantics, forms and validation, dialog and popover, details, and the platform features that replace JS.' },
  { id: '28-modern-css', track: 'web-platform', title: 'Modern CSS', summary: 'Cascade layers, container queries, :has(), nesting, subgrid, view transitions, and new color spaces.' },
  { id: '29-web-apis-fetch-streams-workers', track: 'web-platform', title: 'Web APIs: Fetch, streams, workers', summary: 'AbortController, ReadableStream, Web Workers, Broadcast Channel, and structured clone.' },
  { id: '30-web-apis-storage-observers', track: 'web-platform', title: 'Web APIs: storage and observers', summary: 'IndexedDB, OPFS, Cache API, Intersection/Resize/Mutation Observers, and the Navigation API.' },
  // ---- JavaScript and TypeScript
  { id: '31-modern-javascript', track: 'javascript-typescript', title: 'JavaScript since ES2020', summary: 'Iterator helpers, Set methods, Temporal, using declarations, Array grouping, and Promise.withResolvers.' },
  { id: '32-event-loop-and-async', track: 'javascript-typescript', title: 'The event loop and async patterns', summary: 'Microtasks vs tasks, scheduler.yield, AbortSignal, async iteration, and cancellation.' },
  { id: '33-modules-and-import-maps', track: 'javascript-typescript', title: 'ES modules in the browser and Node', summary: 'ESM vs CJS, import maps, top-level await, dynamic import, and dual packages.' },
  { id: '34-typescript-advanced', track: 'javascript-typescript', title: 'TypeScript beyond the basics', summary: 'Generics, conditional and template literal types, satisfies, type-level tests, and TypeScript 7.' },
  // ---- Tooling
  { id: '35-package-managers', track: 'tooling', title: 'Package managers', summary: 'npm, pnpm, yarn, Bun; lockfiles, workspaces, peer deps, and publishing.' },
  { id: '36-module-bundlers-concepts', track: 'tooling', title: 'How module bundlers work', summary: 'Module graphs, tree shaking, code splitting, HMR, source maps, and ESM/CJS interop.' },
  { id: '37-bundler-landscape', track: 'tooling', title: 'Vite, Rolldown, esbuild, SWC, Turbopack', summary: 'The 2026 bundler landscape, what runs on Rust, and how to migrate from webpack.' },
  { id: '38-linters-and-formatters', track: 'tooling', title: 'Linters and formatters', summary: 'Biome, oxlint, ESLint flat config, Prettier, type-aware rules, and pre-commit hooks.' },
  { id: '39-monorepos', track: 'tooling', title: 'Monorepos', summary: 'pnpm workspaces, Turborepo, Nx, shared configs, and versioning with Changesets.' },
  // ---- Testing
  { id: '19-testing-in-2026', track: 'testing', title: 'A testing strategy for frontends', summary: 'What to test where: unit, component, integration, e2e, visual, and the cost of each.' },
  { id: '40-vitest-deep-dive', track: 'testing', title: 'Vitest deep dive', summary: 'Browser Mode, mocking, fake timers, snapshots, coverage, and workspace projects.' },
  { id: '41-testing-library-philosophy', track: 'testing', title: 'Testing Library, done right', summary: 'Queries by role, user-event, async utilities, and avoiding implementation-detail tests.' },
  { id: '42-playwright-e2e', track: 'testing', title: 'End-to-end with Playwright', summary: 'Locators, fixtures, tracing, network mocking, and running against preview deploys.' },
  { id: '43-api-mocking-and-storybook', track: 'testing', title: 'MSW, Storybook, and visual testing', summary: 'Mock the network once, document components, and catch visual regressions.' },
  // ---- Rendering strategies
  { id: '44-rendering-strategies', track: 'rendering', title: 'CSR, SSR, SSG, ISR, streaming', summary: 'The rendering spectrum, tradeoffs, and how to pick per route.' },
  { id: '45-hydration', track: 'rendering', title: 'Hydration and its failure modes', summary: 'Mismatches, selective and progressive hydration, islands, and partial prerendering.' },
  { id: '46-ssr-in-practice', track: 'rendering', title: 'SSR in practice', summary: 'Data loading, caching, streaming with Suspense, and what runs where in Next.js and React Router.' },
  { id: '47-static-site-generators', track: 'rendering', title: 'Static site generators', summary: 'Astro, Eleventy, Docusaurus, VitePress; content collections, MDX, and build-time data.' },
  { id: '48-choosing-a-framework', track: 'rendering', title: 'Choosing a meta-framework', summary: 'Next.js, React Router, TanStack Start, Astro, SvelteKit, Nuxt: a decision framework.' },
  // ---- Performance
  { id: '49-core-web-vitals', track: 'performance', title: 'Core Web Vitals and measurement', summary: 'LCP, INP, CLS; Lighthouse, DevTools, RUM, and the web-vitals library.' },
  { id: '50-loading-performance', track: 'performance', title: 'Loading performance', summary: 'Code splitting, lazy loading, preload/prefetch, priority hints, and fonts.' },
  { id: '51-images-and-media', track: 'performance', title: 'Images and media', summary: 'Formats, srcset and sizes, lazy loading, image CDNs, and video best practices.' },
  { id: '52-caching-strategies', track: 'performance', title: 'Caching strategies', summary: 'Cache-Control, ETags, immutable assets, CDNs, service worker caches, and stale-while-revalidate.' },
  { id: '53-runtime-performance', track: 'performance', title: 'Runtime performance', summary: 'Long tasks, INP, scheduler.yield, virtualization, workers, and avoiding layout thrash.' },
  { id: '54-react-performance', track: 'performance', title: 'React performance', summary: 'Profiler, the Compiler, memo boundaries, transitions, Activity, and bundle analysis.' },
  // ---- Accessibility
  { id: '55-accessibility-foundations', track: 'accessibility', title: 'Accessibility foundations', summary: 'WCAG 2.2, the POUR principles, legal context, and how assistive tech consumes the page.' },
  { id: '56-semantic-html-and-landmarks', track: 'accessibility', title: 'Semantic HTML and landmarks', summary: 'Headings, landmarks, lists, tables, and why divs with click handlers fail.' },
  { id: '57-aria-done-right', track: 'accessibility', title: 'ARIA, done right', summary: 'Roles, states, properties, live regions, and the first rule of ARIA.' },
  { id: '58-keyboard-and-focus', track: 'accessibility', title: 'Keyboard and focus management', summary: 'Tab order, focus traps, roving tabindex, dialogs, inert, and the popover API.' },
  { id: '59-accessible-forms-and-motion', track: 'accessibility', title: 'Accessible forms, color, and motion', summary: 'Labels and errors, contrast, prefers-reduced-motion, and announcing changes.' },
  { id: '60-testing-accessibility', track: 'accessibility', title: 'Testing accessibility', summary: 'axe, Testing Library role queries, Playwright a11y checks, and screen reader smoke tests.' },
  { id: '61-accessible-react-components', track: 'accessibility', title: 'Accessible React components', summary: 'Headless libraries (Radix, Base UI, React Aria) and building a compliant combobox.' },
  // ---- Security
  { id: '62-frontend-threat-model', track: 'security', title: 'A frontend threat model', summary: 'OWASP Top 10 through a frontend lens and what the browser does and does not protect.' },
  { id: '63-xss-and-sanitization', track: 'security', title: 'XSS and sanitization', summary: 'Reflected, stored, DOM-based XSS; React escaping; DOMPurify; Trusted Types.' },
  { id: '64-content-security-policy', track: 'security', title: 'Content Security Policy', summary: 'Directives, nonces and hashes, strict-dynamic, reporting, and CSP with Vite and Next.js.' },
  { id: '65-cors-explained', track: 'security', title: 'CORS, explained properly', summary: 'Simple vs preflighted requests, credentials, and the errors everyone misreads.' },
  { id: '66-csrf-clickjacking-isolation', track: 'security', title: 'CSRF, clickjacking, and isolation', summary: 'SameSite cookies, CSRF tokens, frame-ancestors, COOP and COEP.' },
  { id: '67-https-and-headers', track: 'security', title: 'HTTPS and security headers', summary: 'TLS basics, HSTS, mixed content, Subresource Integrity, Permissions-Policy.' },
  { id: '68-supply-chain-security', track: 'security', title: 'Supply chain security', summary: 'Lockfiles, provenance, install scripts, pnpm quarantine, and the 2025 RSC RCE as a case study.' },
  // ---- Auth
  { id: '69-sessions-vs-tokens', track: 'auth', title: 'Sessions vs tokens', summary: 'Cookie sessions, bearer tokens, where each breaks, and the BFF pattern.' },
  { id: '70-cookies-and-token-storage', track: 'auth', title: 'Cookies and token storage', summary: 'HttpOnly, Secure, SameSite, partitioned cookies, and why localStorage tokens are risky.' },
  { id: '71-jwt-in-depth', track: 'auth', title: 'JWT in depth', summary: 'Structure, signing, validation pitfalls, refresh rotation, and revocation.' },
  { id: '72-oauth-and-oidc', track: 'auth', title: 'OAuth 2.1 and OpenID Connect', summary: 'Authorization code with PKCE for SPAs, ID tokens, scopes, and common misuse.' },
  { id: '73-passkeys-and-sso', track: 'auth', title: 'Passkeys, WebAuthn, and SSO', summary: 'Passwordless login, SAML and enterprise SSO, and MFA options.' },
  { id: '74-auth-in-react-apps', track: 'auth', title: 'Auth in React apps', summary: 'Protected routes, session refresh, Auth.js, Clerk, Better Auth, and Supabase compared.' },
  // ---- GraphQL
  { id: '75-graphql-fundamentals', track: 'graphql', title: 'GraphQL fundamentals', summary: 'SDL, the type system, queries, mutations, subscriptions, and introspection.' },
  { id: '76-graphql-operations', track: 'graphql', title: 'Writing good operations', summary: 'Fragments, variables, directives, pagination patterns, and error handling.' },
  { id: '77-graphql-clients', track: 'graphql', title: 'Apollo, urql, Relay', summary: 'Normalized caches, optimistic updates, and client architecture.' },
  { id: '78-graphql-typescript-codegen', track: 'graphql', title: 'GraphQL with TypeScript', summary: 'Codegen, typed documents, and the persisted-query workflow.' },
  { id: '79-graphql-vs-rest-vs-trpc', track: 'graphql', title: 'GraphQL vs REST vs tRPC', summary: 'When each wins, N+1 and security concerns, and federation at scale.' },
  // ---- Web Components
  { id: '80-custom-elements', track: 'web-components', title: 'Custom elements', summary: 'Defining elements, lifecycle callbacks, attributes vs properties, and events.' },
  { id: '81-shadow-dom-and-slots', track: 'web-components', title: 'Shadow DOM, templates, and slots', summary: 'Encapsulation, ::part and CSS shadow parts, adoptedStyleSheets, and declarative Shadow DOM.' },
  { id: '82-lit-and-web-component-libraries', track: 'web-components', title: 'Lit and the web component ecosystem', summary: 'Reactive properties, templates, and design systems shipped as web components.' },
  { id: '83-web-components-with-react', track: 'web-components', title: 'Web components with React 19', summary: 'Full custom element support in React 19, events, and when to reach for one.' },
  // ---- PWAs, mobile, desktop
  { id: '84-pwa-fundamentals', track: 'pwa', title: 'PWA fundamentals', summary: 'Manifests, installability, display modes, and the app-like UX checklist.' },
  { id: '85-service-workers-and-offline', track: 'pwa', title: 'Service workers and offline', summary: 'Lifecycle, caching strategies, Workbox, background sync, and update flows.' },
  { id: '86-push-and-platform-capabilities', track: 'pwa', title: 'Push and platform capabilities', summary: 'Web Push, badging, share target, file handling, and permissions UX.' },
  { id: '87-mobile-apps-from-web-skills', track: 'pwa', title: 'Mobile apps from web skills', summary: 'React Native and Expo, Capacitor, Ionic, and where Flutter fits.' },
  { id: '88-desktop-apps', track: 'pwa', title: 'Desktop apps: Electron and Tauri', summary: 'Architectures, security models, packaging, and auto-update.' },
  // ---- Deployment and CI/CD
  { id: '89-static-hosting-and-cdns', track: 'deployment', title: 'Static hosting and CDNs', summary: 'GitHub Pages, Netlify, Vercel, Cloudflare Pages; caching, redirects, and SPA fallbacks.' },
  { id: '90-servers-serverless-edge', track: 'deployment', title: 'Servers, serverless, and edge', summary: 'Node hosts, Railway and Render, serverless functions, edge runtimes, and cold starts.' },
  { id: '91-containers-for-frontends', track: 'deployment', title: 'Containers for frontends', summary: 'Multi-stage Dockerfiles, nginx for SPAs, and running SSR in a container.' },
  { id: '92-ci-cd-with-github-actions', track: 'deployment', title: 'CI/CD with GitHub Actions', summary: 'Test, typecheck, build, cache, preview deploys, and required checks.' },
  { id: '93-release-safety', track: 'deployment', title: 'Release safety and observability', summary: 'Environment config, feature flags, canaries and rollbacks, Sentry, and RUM.' },
  // ---- Design systems and CSS architecture
  { id: '94-css-architecture', track: 'design-systems', title: 'CSS architecture', summary: 'BEM to utility-first, CSS Modules, cascade layers, and scoping strategies.' },
  { id: '95-design-tokens-and-theming', track: 'design-systems', title: 'Design tokens and theming', summary: 'Token pipelines, CSS variables, dark mode, and Tailwind v4 theme config.' },
  { id: '96-component-libraries', track: 'design-systems', title: 'Component libraries and headless UI', summary: 'shadcn/ui on Base UI, Radix, React Aria, and building your own primitives.' },
  { id: '97-storybook-and-design-handoff', track: 'design-systems', title: 'Storybook and design handoff', summary: 'Stories as documentation, Figma to code, and visual review workflows.' },
  // ---- AI-assisted development
  { id: '98-ai-coding-tools', track: 'ai-assisted', title: 'AI coding tools and agents', summary: 'Claude Code, Cursor, Copilot; agentic workflows, and where they help or hurt.' },
  { id: '99-prompting-and-context', track: 'ai-assisted', title: 'Prompting, context, and skills', summary: 'Specs over vibes, context files, skills and MCP, and reviewing AI-written code.' },
  { id: '100-building-llm-features', track: 'ai-assisted', title: 'Building LLM features in a frontend', summary: 'Streaming UIs, tool use, structured outputs, cost and latency, and safety basics.' },
  { id: '101-ai-and-frontend-quality', track: 'ai-assisted', title: 'AI and frontend quality', summary: 'AI-assisted tests, accessibility audits, refactors, and keeping humans in the loop.' },
  // ---- Go
  { id: '102-go-for-typescript-developers', track: 'go', title: 'Go for TypeScript developers', summary: 'Syntax and types, structs and interfaces, errors as values, slices and maps, goroutines, and the go tool.' },
  { id: '103-http-services-in-go', track: 'go', title: 'HTTP services in Go', summary: 'net/http routing patterns, handlers, middleware chains, context, JSON, error responses, and httptest.' },
  { id: '104-go-service-patterns', track: 'go', title: 'Go service patterns', summary: 'Project layout, dependency injection, error wrapping, cancellation, worker pools, graceful shutdown, and slog.' },
  { id: '105-integrations-in-go', track: 'go', title: 'Integrations in Go', summary: 'Webhook signatures and idempotency, retries and backoff, rate limiting, async queues, and observability of the contract.' },
  // ---- PostgreSQL
  { id: '106-schema-design-for-project-data', track: 'postgres', title: 'Schema design for cross-organization project data', summary: 'Organizations, projects, tasks, dependencies, and sharing across companies; constraints, enums, soft deletes, audit columns.' },
  { id: '107-queries-that-answer-product-questions', track: 'postgres', title: 'Queries that answer product questions', summary: 'Joins, CTEs, window functions, recursive CTEs for hierarchies and dependency graphs, LATERAL, and jsonb.' },
  { id: '108-indexes-and-explain', track: 'postgres', title: 'Indexes and EXPLAIN', summary: 'Btree, composite, partial, covering, and GIN indexes; reading plans; the database side of n+1.' },
  { id: '109-migrations-and-schema-evolution', track: 'postgres', title: 'Migrations and schema evolution', summary: 'Expand/contract, zero-downtime changes, batched backfills, locks and CONCURRENTLY, and migration tools.' },
  // ---- GraphQL extension
  { id: '110-graphql-servers-in-go', track: 'graphql', title: 'GraphQL servers in Go', summary: 'gqlgen schema-first workflow, resolvers, dataloaders for n+1, complexity limits, and auth in context.' },
  { id: '111-apollo-client-in-react', track: 'graphql', title: 'Apollo Client in React', summary: 'Normalized cache and typePolicies, fragments, useQuery and useMutation, optimistic updates, pagination, codegen.' },
  // ---- Interview practice
  { id: '112-system-design-cross-org-collaboration', track: 'interview', title: 'System design: cross-organization collaboration', summary: 'Permissions across companies, real-time updates, conflict handling, audit history, and the data model for shared programs.' },
  { id: '113-live-coding-drills', track: 'interview', title: 'Live-coding drills for project UIs', summary: 'Timeboxed React exercises: dependency lists with cycle detection, large task tables, optimistic edits with rollback.' },
  { id: '114-take-home-rehearsal', track: 'interview', title: 'Take-home rehearsal', summary: 'A Go API, Postgres schema, React UI, and GitHub Actions workflow template, with a reviewer checklist.' },
  { id: '115-product-thinking-and-ownership', track: 'interview', title: 'Product thinking and ownership', summary: 'Talking about tradeoffs, pushing back on specs, UX polish as an engineering requirement, and questions to ask.' },
];
