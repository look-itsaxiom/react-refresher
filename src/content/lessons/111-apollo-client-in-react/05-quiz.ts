import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        "A `useMutation` call for `addTask` returns the new task with an `id`, and the list screen doesn't update even though the mutation clearly succeeded (the response has the right data). What's the most likely cause, and what are the two ways to fix it?",
      choices: [
        {
          id: 'a',
          text: "Apollo's automatic cache merge only updates entities that are already normalized in the cache by id — nothing tells it which list a brand-new entity belongs in. Fix it with a manual `update(cache, { data })` that reads the list with `cache.readQuery`/`cache.modify` and splices the new item in, or fall back to `refetchQueries` for the list query.",
        },
        { id: 'b', text: "The mutation needs `fetchPolicy: 'no-cache'` so the response is allowed to touch the cache at all." },
        { id: 'c', text: 'Nothing needs to change — Apollo always re-runs every active query after any mutation completes.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "Apollo's automatic-by-id merge is real, but it only covers \"a field changed on an entity that's already in some cached query result.\" A create has no existing list membership for the cache to infer, so it's either a manual `update` (precise, one extra write) or `refetchQueries` (blunt, one extra round trip) — there's no automatic third option.",
    },
    {
      id: 'q2',
      prompt:
        "A `posts(status: String)` field is cached with `keyArgs: ['status']`, and the UI also paginates it with `offset`/`limit`. After scrolling to page 3, switching the `status` filter and back, the list only shows page 1's items again, dropping the later pages. What's the mismatch between the `merge` function and the `keyArgs` policy?",
      choices: [
        {
          id: 'a',
          text: "Nothing is wrong with `keyArgs` — `status` correctly isolates each filter's cache slot. The bug is a `merge` function that always concatenates every incoming page onto the existing list without ever resetting: switching status returns a *fresh* first page for that slot, but if merge always appends instead of replacing on a first-page (offset 0) fetch, old and new data pile up instead. The fix is a merge function that checks the incoming page's own offset/args and replaces rather than appends when it's page 1.",
        },
        { id: 'b', text: "`keyArgs` should include `offset` too, so every page gets its own separate cache slot." },
        { id: 'c', text: "This is expected — Apollo always discards cached pagination state when any argument changes, by design." },
      ],
      correctChoiceId: 'a',
      explanation:
        "This is the pagination gotcha in reverse from the usual one: too broad a `keyArgs` fragments a list across cache slots; a `merge` that doesn't account for which page it's receiving corrupts a single slot instead. Both are real interview-relevant Apollo bugs and they look almost identical from the UI (list shows the 'wrong' items) but need opposite fixes.",
    },
    {
      id: 'q3',
      prompt:
        "A `useQuery(GET_TASK, { fetchPolicy: 'no-cache' })` and a `useQuery(GET_TASK, { fetchPolicy: 'network-only' })` both always hit the network and never serve a cached result. A teammate says they're interchangeable. What's the actual difference, and when does it matter?",
      choices: [
        {
          id: 'a',
          text: "`network-only` still normalizes the response into the cache after fetching, so other queries sharing that entity see the update. `no-cache` skips the cache entirely — the data is invisible to `cache.modify`, to other queries, and to devtools. It matters for anything where you deliberately don't want a response polluting shared cache state (a one-off preview fetch, sensitive data you don't want normalized and readable elsewhere).",
        },
        { id: 'b', text: 'They are interchangeable; both names exist only for historical reasons from Apollo Client 2.' },
        { id: 'c', text: "`no-cache` is `network-only` plus automatic retries on failure — otherwise identical." },
      ],
      correctChoiceId: 'a',
      explanation:
        "This is a specific, commonly-confused pair because both policies share \"always fetch, never serve from cache\" — the difference is entirely about the *write* side, not the read side, which is easy to miss until a `cache.modify` call mysteriously doesn't affect a `no-cache` query's data, or until sensitive data unexpectedly reappears in `cache.extract()`.",
    },
    {
      id: 'q4',
      prompt:
        'A `PostCard` component reads `post.excerpt` directly, but never declared it in its own colocated fragment — a teammate\'s change to the *parent* query happened to also select `excerpt`, so it worked by accident. What is fragment colocation meant to prevent here, and what enforces it in Apollo (unlike Relay)?',
      choices: [
        {
          id: 'a',
          text: "It's meant to prevent exactly this: a component silently depending on a field some other part of the query happens to select, which breaks the moment that unrelated code changes. Apollo doesn't enforce it at compile time the way Relay's fragment masking does — it's a convention backed by code review and, if configured, GraphQL Codegen's typed fragment results, not a runtime or type-level guarantee.",
        },
        { id: 'b', text: "Apollo enforces it automatically: reading a field not declared in the component's own fragment is a runtime error." },
        { id: 'c', text: 'Colocation is purely a file-organization convention with no bearing on correctness; the bug described is unrelated to it.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "This is the honest answer, and worth stating plainly in an interview: colocation is a *discipline* in Apollo, not a guarantee. Relay's masking is the version of this that the type system actually enforces (lesson 77's quiz covers that contrast) — Apollo trades that safety for a lighter-weight fragment API, so the convention still has to be followed by hand.",
    },
    {
      id: 'q5',
      prompt:
        "A mutation's `optimisticResponse` writes a guessed `likeCount` onto a `Post` entity *and* — inside `update` — splices the post into a `topPosts` list it wasn't in before. The request then fails. What's the realistic way this goes wrong even though Apollo does roll back the optimistic overlay automatically?",
      choices: [
        {
          id: 'a',
          text: "Apollo's rollback reverts the whole optimistic layer as a unit when the mutation fails, so a correctly-implemented `update` that only writes through the cache (not through some side channel like a ref or external variable) rolls back cleanly, `topPosts` splice included — the realistic failure is elsewhere: an `update` function with a bug that writes outside the optimistic layer (e.g. mutating a plain object instead of going through `cache.writeQuery`/`cache.modify`), which desyncs from what the rollback actually reverts.",
        },
        { id: 'b', text: 'The `topPosts` splice can never be part of an optimistic write; only entity fields can be optimistic in Apollo.' },
        { id: 'c', text: 'Nothing can go wrong — Apollo does not support calling `update` from within an optimistic response at all.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "The subtlety worth having straight: Apollo's optimistic layer is genuinely all-or-nothing on rollback — the risk isn't \"partial rollback by design,\" it's an `update` function that escapes the layer (writing to something other than the cache) and therefore isn't covered by that rollback at all. Framing it as \"the cache handles this as long as every write goes through it\" is the correct, interview-ready answer.",
    },
    {
      id: 'q6',
      prompt:
        'A dashboard renders five independent `useSuspenseQuery` calls, one in each of five sibling components under a shared `<Suspense>` boundary. A teammate expects all five requests to fire in parallel the instant the boundary renders. When does that expectation actually hold, and when does it break into a waterfall?',
      choices: [
        {
          id: 'a',
          text: "It holds when all five components render in the same pass before any of them suspends — React can start every fetch during that first render attempt, then wait on whichever ones threw a promise. It breaks into a waterfall if any of the five components is *conditionally* rendered based on another one's already-resolved data (nesting instead of sibling placement), since a component that hasn't rendered yet hasn't called its hook yet, so its fetch hasn't started.",
        },
        { id: 'b', text: 'It never holds — `useSuspenseQuery` always serializes requests within a single Suspense boundary regardless of component structure.' },
        { id: 'c', text: "It always holds regardless of structure — Suspense boundaries batch and parallelize every fetch inside them automatically, including nested ones." },
      ],
      correctChoiceId: 'a',
      explanation:
        "The mental model that generalizes: a suspending fetch starts when the hook *runs*, and a hook runs when its component renders. Sibling components under one boundary all get a render attempt in the same pass, so their fetches genuinely overlap. The moment one component's render is gated behind another's resolved data — nesting instead of siblings — the second fetch can't start until the first component stops suspending, and that's the waterfall, independent of whether `useSuspenseQuery` or `useBackgroundQuery`/`useReadQuery` is used for the leaves.",
    },
  ],
};
