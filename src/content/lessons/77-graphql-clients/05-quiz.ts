import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        "A `posts(offset: Int, limit: Int)` field is cached with Apollo's default `keyArgs` (every argument is part of the identity). The UI paginates by increasing `offset`. What goes wrong, and what's the fix?",
      choices: [
        {
          id: 'a',
          text: "Each `offset` value gets its own cache entry instead of one growing list, so 'page 2' doesn't append to 'page 1' — fix it with `keyArgs: ['limit']` (or `false`) plus a `merge` function that concatenates the incoming page onto the existing list.",
        },
        { id: 'b', text: 'Nothing goes wrong — Apollo always concatenates paginated fields automatically regardless of keyArgs.' },
        { id: 'c', text: "The fix is to set `fetchPolicy: 'no-cache'` on the paginated query so pagination bypasses the cache entirely." },
      ],
      correctChoiceId: 'a',
      explanation:
        "Leaving every argument in `keyArgs` means the cache treats `posts(offset:0)` and `posts(offset:10)` as two unrelated fields with two unrelated cache slots. Excluding the pagination arguments from the identity (`keyArgs`) collapses them onto one slot, and a `merge` function is what decides how the new page's items combine with what's already there — this is exactly the mechanism Apollo's offset and cursor pagination helpers wrap.",
    },
    {
      id: 'q2',
      prompt:
        'A normalized cache and a document cache (TanStack Query + `graphql-request`) both received the same `renameUser` mutation response. Which one shows the new name on an unrelated screen that queried the same user through a completely different operation, without that screen refetching?',
      choices: [
        {
          id: 'a',
          text: 'The normalized cache — because it keys storage by entity identity (`Typename:id`), a write to that entity is visible to every query result built from it. The document cache keys by operation, so the other screen\'s cached result is untouched until something invalidates or refetches it.',
        },
        { id: 'b', text: 'Neither — both require an explicit refetch of every screen that shows the same data.' },
        { id: 'c', text: 'The document cache, because TanStack Query invalidates by entity type automatically.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "This is the core tradeoff from the first concept step: identity-keyed storage (normalized) makes cross-query consistency automatic once entities merge; operation-keyed storage (document) makes it manual — you invalidate/refetch the other operation, or don't get consistency for free.",
    },
    {
      id: 'q3',
      prompt:
        'urql\'s default `cacheExchange` invalidates every cached query that mentioned `Post` after any `Post` mutation, even a query for an unrelated single post. Switching to `@urql/exchange-graphcache` fixes the imprecision. What does Graphcache track that the default cache doesn\'t?',
      choices: [
        { id: 'a', text: 'Nothing extra — Graphcache is just the default cache with a bigger in-memory size limit.' },
        {
          id: 'b',
          text: 'Per-entity identity (keys like `Post:9`), so a write can target and update the one entity that changed instead of invalidating every cached document that happened to mention the type at all.',
        },
        { id: 'c', text: 'Only the HTTP response headers, letting it decide cacheability from `Cache-Control`.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "The default exchange's granularity is \"which typenames appeared in this document,\" which is coarse enough that any mutation touching the type invalidates every document that mentioned it. Graphcache normalizes by entity identity, so a mutation only has to touch the specific entity (and any list it should appear in) — everything else stays cached.",
    },
    {
      id: 'q4',
      prompt:
        'A `PostCard` component spreads `...PostCard_post` in its parent\'s query and only reads fields from that fragment. A teammate adds `excerpt` to the parent\'s query directly (not through the fragment) and has `PostCard` read `post.excerpt` anyway. In Apollo/urql this silently works if the parent happened to select it. What does Relay do differently?',
      choices: [
        {
          id: 'a',
          text: "Relay's fragment masking only lets a component read fields its own fragment declared — reading `post.excerpt` without it being part of `PostCard_post` is a type error at build/compile time, not a runtime surprise that only works by accident.",
        },
        { id: 'b', text: 'Relay has no fragments; every component receives the full query result, same as Apollo and urql.' },
        { id: 'c', text: "Relay silently strips `excerpt` from the props at runtime with no build-time signal either way." },
      ],
      correctChoiceId: 'a',
      explanation:
        "This is the bug class masking exists to prevent: a component that happens to work because a sibling elsewhere fetched the field it forgot to select itself. Apollo and urql don't enforce this — masking is specifically Relay's answer, caught by the compiler rather than discovered in production when the parent's query changes.",
    },
    {
      id: 'q5',
      prompt:
        "A mutation's `optimisticResponse` guesses `{ likePost: { __typename: 'Post', id: '9', likeCount: 43 } }`, applied to the cache immediately. The real request then fails. What has to happen for the UI to end up correct, and what's the risk if the optimistic guess had also spliced the post into a separate `topPosts` list?",
      choices: [
        {
          id: 'a',
          text: "The cache needs to restore `Post:9`'s prior `likeCount` on failure (a rollback, not just leaving the failed guess in place). The `topPosts` splice is a separate write against a different part of the cache — the risk is that only the entity write gets rolled back and the list insertion is forgotten, leaving a post that no longer has the extra like also stuck in a list it was optimistically added to.",
        },
        { id: 'b', text: 'Nothing — a failed request never applies its optimistic response, so there is nothing to roll back.' },
        { id: 'c', text: 'The GraphQL server automatically reverts any optimistic write once it detects the client applied one.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "Optimistic writes are applied client-side before the network round trip finishes, on the assumption the guess is right; failure means someone has to undo exactly what was written. A *partial* rollback — reverting the entity but forgetting a list splice, or vice versa — is the realistic failure mode, because the two writes touch different parts of the cache and nothing forces them to be undone together unless the rollback code explicitly tracks both.",
    },
    {
      id: 'q6',
      prompt:
        "A team wants Suspense-driven fetching for a dashboard with five independent queries, all starting from the same parent component, and wants to avoid a waterfall where each query only starts once the previous one's component finishes suspending. Which hook pairing addresses that, and why does a bare `useSuspenseQuery` per query risk the waterfall?",
      choices: [
        {
          id: 'a',
          text: '`useBackgroundQuery` (start the fetch, return a fetch reference) paired with `useReadQuery` (suspend on that reference) — splitting "start" from "suspend on the result" lets a parent kick off all five requests before any child actually suspends. A tree of five separate `useSuspenseQuery` calls, one per nested component, risks each one only starting its fetch once render reaches that component, serializing requests that should run in parallel.',
        },
        { id: 'b', text: '`useSuspenseQuery` alone, called five times in the same component — Suspense automatically parallelizes any hooks called in the same render.' },
        { id: 'c', text: 'Suspense is unrelated to fetch timing; the fix is always `Promise.all` around the queries regardless of which hook is used.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "`useSuspenseQuery` suspends the calling component immediately if data isn't ready, which is simplest to write but means a query nested three components deep doesn't even start fetching until React's render reaches that component — if each of five sibling/nested components does this independently and one blocks the next from rendering, the fetches serialize. `useBackgroundQuery` decouples starting the request from suspending on it, so a parent can fire off several requests up front and let children suspend on already-in-flight results.",
    },
  ],
};
