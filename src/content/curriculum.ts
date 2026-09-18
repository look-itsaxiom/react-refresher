import type { PlannedLesson, Track } from './types';

export const tracks: Track[] = [
  { id: 'refresher', title: 'Refresher', description: 'The fundamentals, re-explained the way React 19 thinks about them.' },
  { id: 'react18', title: 'React 18 features you skipped', description: 'Concurrent rendering, Suspense, transitions, and the hooks that came with them.' },
  { id: 'react19', title: 'React 19', description: 'Actions, use(), useOptimistic, ref as a prop, metadata, and what got removed.' },
  { id: 'compiler', title: 'Compiler-era patterns', description: 'What the React Compiler does for you and how to write code it can optimize.' },
  { id: 'ecosystem', title: 'Ecosystem 2026', description: 'Data fetching, state, forms, styling, testing, and tooling as actually used today.' },
  { id: 'server', title: 'Server-side React', description: 'Server Components and Server Functions: taught and simulated, not executed.' },
];

/** Ordered. Ids with a matching folder under ./lessons are playable; the rest render as locked. */
export const curriculum: PlannedLesson[] = [
  { id: '01-rendering-and-state', track: 'refresher', title: 'Rendering and state', summary: 'Trigger, render, commit. State as a snapshot. Batching and updater functions.' },
  { id: '04-effects-and-refs', track: 'refresher', title: 'You might not need an effect', summary: 'What effects are for, what they are not for, refs, and cleanup.' },
  { id: '05-context-and-composition', track: 'refresher', title: 'Context and composition', summary: 'Lifting state, children as data, context without prop drilling pain.' },
  { id: '06-custom-hooks', track: 'refresher', title: 'Custom hooks', summary: 'Extracting logic, stable identities, and the rules of hooks.' },
  { id: '07-lists-keys-forms', track: 'refresher', title: 'Lists, keys, and controlled inputs', summary: 'Identity, reconciliation, and forms before Actions.' },
  { id: '02-suspense-and-transitions', track: 'react18', title: 'Suspense and transitions', summary: 'Loading boundaries, startTransition, useTransition, useDeferredValue.' },
  { id: '08-concurrent-rendering', track: 'react18', title: 'Concurrent rendering mental model', summary: 'Interruptible rendering, priorities, and what StrictMode double-invokes.' },
  { id: '09-external-stores', track: 'react18', title: 'useSyncExternalStore and useId', summary: 'Subscribing to things outside React without tearing.' },
  { id: '03-actions-and-optimistic-ui', track: 'react19', title: 'Actions and optimistic UI', summary: 'useActionState, useFormStatus, form actions, useOptimistic.' },
  { id: '10-use-and-ref-changes', track: 'react19', title: 'use(), ref as a prop, ref cleanup', summary: 'Reading promises and context with use(); forwardRef is over.' },
  { id: '11-metadata-and-resources', track: 'react19', title: 'Document metadata and resource hints', summary: 'title/meta/link in components, stylesheet precedence, preload APIs.' },
  { id: '12-react-19-removals', track: 'react19', title: 'What React 19 removed', summary: 'propTypes, string refs, legacy context, ReactDOM.render, and how to migrate.' },
  { id: '24-activity-effect-events-view-transitions', track: 'react19', title: 'Activity, useEffectEvent, ViewTransition', summary: 'The 19.2 and 19.3 primitives: hide-but-keep-state, non-reactive effect logic, animated transitions.' },
  { id: '13-what-the-compiler-does', track: 'compiler', title: 'What the React Compiler does', summary: 'Automatic memoization, the rules it relies on, and reading its output.' },
  { id: '14-compiler-friendly-code', track: 'compiler', title: 'Writing compiler-friendly code', summary: 'Purity, mutation, and when useMemo/useCallback still matter.' },
  { id: '15-server-state-tanstack-query', track: 'ecosystem', title: 'Server state with TanStack Query', summary: 'Queries, mutations, invalidation, and why useEffect fetching is gone.' },
  { id: '16-client-state-zustand', track: 'ecosystem', title: 'Client state with Zustand and friends', summary: 'Stores without boilerplate; when context is enough.' },
  { id: '17-forms-and-validation', track: 'ecosystem', title: 'Forms and validation', summary: 'Actions vs react-hook-form vs TanStack Form; Zod schemas.' },
  { id: '18-styling-in-2026', track: 'ecosystem', title: 'Styling in 2026', summary: 'Tailwind v4, CSS Modules, and why runtime CSS-in-JS faded.' },
  { id: '19-testing-in-2026', track: 'ecosystem', title: 'Testing in 2026', summary: 'Vitest, Testing Library, Playwright, MSW, Storybook.' },
  { id: '20-typescript-react-idioms', track: 'ecosystem', title: 'TypeScript and React idioms', summary: 'ComponentProps, discriminated props, satisfies, no more React.FC debates.' },
  { id: '21-server-components', track: 'server', title: 'Server Components', summary: 'The client/server boundary, "use client", serialization rules.' },
  { id: '22-server-functions', track: 'server', title: 'Server Functions', summary: '"use server", calling the server from forms and events, revalidation.' },
  { id: '23-frameworks', track: 'server', title: 'Next.js, React Router framework mode, TanStack Start', summary: 'How the frameworks package RSC and where they differ.' },
];
