import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A dashboard widget polls a live order queue that changes every few seconds; another widget shows a pricing config that only changes on deploy. Same `QueryClient`, same defaults. What should differ between the two queries?',
      choices: [
        { id: 'a', text: 'Nothing — leave both at the library default and let background refetch-on-focus handle it.' },
        {
          id: 'b',
          text: "The order queue should keep a low or zero staleTime so remounts and refocus trigger a refetch; the pricing config should set a long or infinite staleTime so it isn't refetched just because a component remounted.",
        },
        { id: 'c', text: 'Both should use `gcTime: 0` so neither is ever cached.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "staleTime is a per-query judgment call about how long a cached value is trustworthy, not a knob to leave alone. Data you don't own and that changes on its own timeline wants a short staleTime; data that only changes when you deploy wants a long one — refetching it constantly is pure waste.",
    },
    {
      id: 'q2',
      prompt:
        'A `useQuery` call fetches a filtered, paginated list: `fetchTodos({ status, page })`. Where should `status` and `page` live?',
      choices: [
        { id: 'a', text: 'Inside the query function only, reading component state — the queryKey can just be `[\'todos\']`.' },
        {
          id: 'b',
          text: "In the queryKey — `['todos', { status, page }]` — so each combination gets its own cache entry and changing either one is recognized as \"a different query,\" not a stale read of the old one.",
        },
        { id: 'c', text: 'In a `useEffect` that calls `refetch()` manually whenever `status` or `page` changes.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'queryKey plays the role a dependency array plays for useEffect: anything the query function reads that should produce a different result belongs in the key. Leaving status/page out of the key means page 2 can render page 1\'s cached data, or a manual refetch effect has to reinvent what the key would have done for free.',
    },
    {
      id: 'q3',
      prompt:
        "React 19's `useOptimistic` rolls back automatically once the real state settles. TanStack Query's optimistic-update recipe (`onMutate`/`onError`) rolls back manually, with a snapshot you provide. Why the difference?",
      choices: [
        {
          id: 'a',
          text: "`useOptimistic` is layered over one component tree's local state, which React can diff against the real value on the next render; a QueryClient's cache is shared and long-lived, so there's no single render's state for the library to compare against — it needs you to hand it a snapshot to restore.",
        },
        { id: 'b', text: 'TanStack Query does not actually support rollback; onError is only for logging.' },
        { id: 'c', text: 'useOptimistic is deprecated in favor of the onMutate/onError pattern as of 2026.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "Both patterns solve the same problem (show the guess, reconcile with reality) but at different layers. useOptimistic's automatic discard works because React owns the before/after state. A query cache is external and shared across the app, so the library gives you the write primitive and lets you decide what \"before\" means.",
    },
    {
      id: 'q4',
      prompt:
        'After a mutation succeeds, when should you call `queryClient.setQueryData(key, ...)` with the mutation response instead of `queryClient.invalidateQueries({ queryKey: key })`?',
      choices: [
        {
          id: 'a',
          text: 'Never — invalidateQueries is strictly safer and should always be preferred, even if it costs an extra round trip.',
        },
        {
          id: 'b',
          text: "When the mutation's response already IS the true next value for that key (e.g. a PATCH that returns the full updated record) and a refetch would just re-request something you already have — otherwise, invalidate and let the server answer for anything with server-computed fields, pagination, or sorting you can't cheaply reproduce.",
        },
        { id: 'c', text: 'Only inside `onMutate`, never inside `onSuccess` or `onSettled`.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "invalidateQueries defers to the server, which is right whenever the true next state depends on things the client doesn't fully control. setQueryData is for when you already hold the correct value and refetching would be redundant work — it's a write, not a fallback.",
    },
    {
      id: 'q5',
      prompt: 'Starting a new query for a feature shipping in 2026, with a `<Suspense>` boundary already available above it, which should you reach for by default: `useQuery` or `useSuspenseQuery`?',
      choices: [
        {
          id: 'a',
          text: '`useSuspenseQuery` — it removes the `isPending`/`isError` branches from every call site, narrows `data` to never be `undefined`, and defers loading/error UI to the Suspense boundary and error boundary that already exist for this reason.',
        },
        { id: 'b', text: '`useQuery`, always — Suspense integration for data fetching is still experimental in 2026 and should be avoided.' },
        { id: 'c', text: 'It does not matter; the two hooks are aliases for each other.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "useSuspenseQuery is the better default once Suspense boundaries are already part of the app's error/loading strategy: less branching per call site, and a type-safe `data` instead of `T | undefined` everywhere. useQuery still earns its place for queries that must render even without a Suspense boundary, or that need to stay interactive during a background refetch (`isFetching` without suspending).",
    },
    {
      id: 'q6',
      prompt:
        "An app renders a product page as a Server Component that fetches the product directly during the server render. A \"live viewer count\" badge on the same page updates every few seconds and includes a client-side \"favorite\" button. What's the right split?",
      choices: [
        {
          id: 'a',
          text: 'Fetch the product in the Server Component (no client cache needed — it is fine as of the last server render) and use TanStack Query on the client for the viewer count (needs polling) and the favorite mutation (needs optimistic UI and invalidation).',
        },
        { id: 'b', text: 'Move everything to TanStack Query, including the product fetch, since RSC and TanStack Query cannot be used on the same page.' },
        { id: 'c', text: 'Move everything into the Server Component, including the live viewer count, since Server Components are always strictly better.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "RSC and TanStack Query solve different problems and compose on the same page: RSC is for the initial read of content that's fine as of render time, with no client cache to maintain. TanStack Query is for anything the client needs to ask again on its own — polling, refetch-on-focus, or a mutation with optimistic UI. Reaching for one to replace the other where it doesn't fit means either an unnecessary client round trip or a page that can't refresh itself.",
    },
  ],
};
