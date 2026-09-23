# Apollo Client 4 in a React 19 app

Lesson 77 built the mechanic — a normalized cache keyed by `Typename:id`, and why that
beats a document cache (TanStack Query's model) for cross-query consistency. Apollo
Client is the library that mechanic is modeled on, and by far the one you'll be asked
about in a full-stack interview: it predates urql and Relay in most job descriptions,
and "Apollo familiarity" shows up as a line item even on teams that don't use GraphQL
day to day, because so much of its cache-as-state-manager vocabulary (`typePolicies`,
`fetchPolicy`, optimistic `update`) has become the way people *talk* about client
caching in general. This step is the API surface: what you actually import, call, and
configure. The exercise right after it has you build a teaching miniature of that
surface — not a full reimplementation, enough to make the mechanics concrete.

## Setup

Apollo Client 4 (2025) split the package: the client, cache, and link machinery live at
`@apollo/client`, and the React bindings — every hook below — live at
`@apollo/client/react`. This isn't cosmetic; it's the same "keep framework bindings out
of the core" move React Query and Relay both made, and it means a non-React consumer
(a script, a Node service reading the same cache) doesn't pull in React as a dependency.
Links also moved to being built on `rxjs` Observables under the hood in v4, which mostly
matters if you're writing a custom link — most apps just compose `HttpLink` and call it
done. (Verify exact version numbers and the rxjs detail against the v3→v4 migration
guide before repeating them in an interview — package boundaries are exactly the kind of
thing that shifts between minor releases.)

```tsx
import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';

const client = new ApolloClient({
  link: new HttpLink({ uri: '/graphql' }),
  cache: new InMemoryCache(),
});

function Root() {
  return (
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  );
}
```

## `useQuery`

```tsx
const { data, loading, error, refetch } = useQuery(GET_TASKS, {
  variables: { projectId },
  fetchPolicy: 'cache-first',
  skip: !projectId,
});
```

- `skip` — don't run the query at all (useful for a variable that isn't ready yet,
  instead of guarding the whole component).
- `fetchPolicy` is the one setting worth internalizing cold, because "why didn't my UI
  update" and "why did this refetch when I didn't expect it" both trace back to it:
  - `cache-first` (default) — serve from cache if present, no network call.
  - `network-only` — always hit the network, but still write the result into the cache.
  - `cache-and-network` — serve cached data immediately, then fetch and update.
  - `no-cache` — always hit the network, and **don't** write the result into the cache
    at all. Easy to confuse with `network-only`: both always fetch, but `no-cache`
    means this query's data is invisible to every other query and to `cache.modify` —
    it never gets normalized in.
  - `cache-only` — never fetches; errors (or returns nothing) if the cache is empty.
- `nextFetchPolicy` — the policy to switch to *after* the first request, so you can do
  `cache-and-network` on mount and then settle into `cache-first` for the rest of the
  component's life.
- `pollInterval` — refetch on a timer; set to `0` to stop.

## Suspense: `useSuspenseQuery`, `useBackgroundQuery`, `useReadQuery`

`useSuspenseQuery` suspends the calling component until data is ready — closest thing to
"just await it" in a component body, and it's the one to reach for by default now that
React 19's Suspense and `useTransition` are the standard way to sequence loading state
(see lesson 08 for Suspense fundamentals, lesson 15 for TanStack Query's equivalent).
The catch: a suspending component blocks its own subtree from rendering, so five
independent queries nested in five different components can end up starting one after
another instead of in parallel — a request waterfall.

`useBackgroundQuery` + `useReadQuery` split "start the request" from "suspend on it": a
parent calls `useBackgroundQuery` for each of several queries up front (returns a fetch
reference immediately, doesn't suspend), and each child calls `useReadQuery` on its
reference to actually suspend and read the result. All the requests are in flight before
any child suspends. This is the same "hoist the fetch, suspend lower" shape as
`use()` over a promise created at a parent.

## `useLazyQuery` and `useMutation`

`useLazyQuery` returns a trigger function instead of firing on render — for search-as-
you-type or "load more" where the query shouldn't run until something happens.

```tsx
const [mutate, { loading, error }] = useMutation(RENAME_TASK, {
  optimisticResponse: (vars) => ({ renameTask: { __typename: 'Task', id: vars.id, title: vars.title } }),
  update(cache, { data }) {
    // cache.modify / cache.writeQuery — see the next concept step.
  },
  onCompleted: (data) => { /* ... */ },
  refetchQueries: ['ListTasks'],
  awaitRefetchQueries: true,
});
```

`refetchQueries` is the blunt-instrument alternative to a precise `update`: name queries
(or pass `{ query, variables }` pairs) to refetch after the mutation settles.
`awaitRefetchQueries` makes `mutate()`'s returned promise wait for those refetches too,
not just the mutation itself — matters if you navigate or show a success toast
immediately after `await mutate(...)`.

## Error policies

By default a GraphQL response with `errors` and partial `data` is treated as a hard
error — `data` comes back `undefined`. `errorPolicy: 'all'` on a query or mutation keeps
the partial `data` alongside the error, so you can render what did resolve and just flag
the field that didn't (a comments count that failed to load shouldn't blank out the
whole post).

## Fragments: `useFragment` and colocation

The convention — and it's a strong one, worth stating explicitly since it's easy to miss
coming from REST — is that a component declares its **own** fragment for the fields it
reads, and the parent's query spreads that fragment in rather than selecting those
fields itself. The component owns its data requirements; the parent doesn't need to know
what `<TaskRow>` needs internally to compose it.

`useFragment(fragment, { from: { __typename: 'Task', id } })` reads (and *only*
re-renders on changes to) one entity's fragment slice directly from the cache, without
being tied to any particular query — useful for a component that's handed an id (or a
ref) and needs to read live data for it, independent of whichever query first fetched
it. `@nonreactive` on a field inside a larger query opts that field out of triggering
re-renders when it changes — for data a component reads once but doesn't need to track
live (an author's name on a comment, say).

## TypeScript: GraphQL Codegen and `TypedDocumentNode`

Lesson 78 covered the `client-preset` codegen setup in depth. The short version for this
lesson: a `TypedDocumentNode<TData, TVariables>` carries both types on the document
itself, so `useQuery(GET_TASKS)` infers `data`'s shape with no generic to write by hand,
and passing the wrong `variables` is a compile error instead of a runtime `undefined`.

## Server-side rendering and React Server Components

Apollo publishes a separate Next.js integration package
(`@apollo/client-integration-nextjs`) with a `PreloadQuery`-style API for starting a
query in a Server Component and streaming its result to a Client Component that reads it
with a query hook. Treat the exact API here as a hedge — this is the area that has moved
fastest across Apollo Client 3 and 4, and RSC-compatible data libraries in general are
still settling; verify the current shape against Apollo's own Next.js docs before
building on it.

## Further reading (optional)

- [Apollo Client docs](https://www.apollographql.com/docs/react)
- [Apollo Client fetch policies](https://www.apollographql.com/docs/react/data/queries#setting-a-fetch-policy)
- [Apollo Client Suspense hooks](https://www.apollographql.com/docs/react/data/suspense)
- [Apollo Client Next.js integration](https://www.apollographql.com/docs/react/integrations/react-server-components)
