import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A schema declares `tags: [String!]`. A resolver for it can legally return which of these: `null`, `[]`, `["a", null]`, `["a", "b"]`?',
      choices: [
        { id: 'a', text: '`null`, `[]`, and `["a", "b"]` — but not `["a", null]`.' },
        { id: 'b', text: 'Only `["a", "b"]` — the others are all illegal for a list type.' },
        { id: 'c', text: 'All four are legal; nullability only applies to scalar fields, not lists.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "`[String!]` has no `!` on the list itself, so the list can be `null`. The `!` is on `String`, so no element can be `null` once the list exists. `[]` is always fine for either a nullable or non-null list — nullability constrains whether the list itself is absent, not whether it's empty.",
    },
    {
      id: 'q2',
      prompt:
        "A `Post.author` field is typed `User!` (non-null). The resolver for `author` throws because the linked user record was deleted. The client's query also selects `sibling: title` on the same `Post`. What does the response look like?",
      choices: [
        {
          id: 'a',
          text: 'The whole response is `data: null` — athrown resolver always fails the entire request.',
        },
        {
          id: 'b',
          text: "The failure bubbles to the nearest nullable ancestor. If `Post` itself is returned through a nullable field (e.g. a top-level `post: Post`), that `post` becomes `null` in `data`, `title` is discarded along with it, and one entry lands in `errors` with `path` pointing at `author`. If `Post` is reached through a non-null chain all the way to the root, `data` itself becomes `null`.",
        },
        { id: 'c', text: '`author` becomes `null` in the response, `sibling` resolves normally, and one error is recorded.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "`author` can't independently become `null` — it's typed `User!`. The failure must bubble to a field that's allowed to be `null`, taking that field's entire subtree (including sibling selections at the same level, like `title`) down with it. Where the bubble stops depends entirely on how many ancestors, walking up from `author`, are also non-null.",
    },
    {
      id: 'q3',
      prompt:
        'A field `searchResults: [SearchResult!]!` returns a union of `User | Post`. A resolver for it returns raw database rows that happen to share an `id` column. What does the query executor need in order to pick the right fields for each row?',
      choices: [
        { id: 'a', text: 'Nothing extra — the executor infers the concrete type from which fields the client selected.' },
        {
          id: 'b',
          text: "Each resolved value needs a way to report its own concrete type at runtime — conventionally a `__typename` (either set directly on the value, or computed by a `resolveType` function the server registers for that union/interface) — because the union's declared type alone doesn't say which member a given value is.",
        },
        { id: 'c', text: 'The client must always request `__typename` explicitly, or the query is rejected at validation time.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "A union or interface field's declared type tells you the set of *possible* concrete types, not which one a given resolved value actually is. Something at runtime — the value carrying its own `__typename`, or a server-side `resolveType` hook — has to make that call before the executor knows whether to apply `User`'s fields or `Post`'s.",
    },
    {
      id: 'q4',
      prompt:
        'A client sends `mutation { a: setStatus(id: "1", status: DONE) b: setStatus(id: "1", status: TODO) }` against a spec-compliant server. Is the final stored status for id `"1"` guaranteed to be `TODO`?',
      choices: [
        {
          id: 'a',
          text: "Yes — the spec requires a mutation's top-level fields to execute serially, in document order, so `b` is guaranteed to start only after `a` has fully finished.",
        },
        { id: 'b', text: 'No — mutation fields execute in parallel just like query fields, so either could finish last.' },
        { id: 'c', text: "It's undefined — the spec leaves mutation field ordering entirely up to the server implementation." },
      ],
      correctChoiceId: 'a',
      explanation:
        "This is the one ordering guarantee GraphQL execution makes: top-level mutation fields run serially, in the order they appear in the document. It exists precisely so a client can chain dependent writes in one request and trust the order — nested fields inside each mutation's result still execute under the normal (parallel-allowed) rule.",
    },
    {
      id: 'q5',
      prompt:
        "A team disables introspection in production (`__schema` and `__type` queries return an error) but leaves `__typename` working. A teammate asks whether this breaks their Apollo Client app's normalized cache, which relies on `__typename` to key objects. Does it?",
      choices: [
        { id: 'a', text: "Yes — Apollo Client's cache calls `__schema` internally on every request to validate types." },
        {
          id: 'b',
          text: "No — `__typename` is a per-object meta-field resolved during normal query execution against actual response data, unrelated to the `__schema`/`__type` introspection queries that expose the schema's structure; disabling those doesn't touch `__typename`.",
        },
        { id: 'c', text: 'It depends on whether the server uses REST or GraphQL underneath.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Introspection (`__schema`, `__type`) is a separate mechanism from `__typename` — introspection describes the schema itself (used by tooling like GraphiQL and codegen), while `__typename` is resolved per response object during ordinary execution. Locking down introspection for production hardening is a common, safe pattern precisely because it doesn't require touching `__typename` or breaking clients that depend on it.",
    },
    {
      id: 'q6',
      prompt:
        "A frontend team wants to fetch a query with a plain browser `fetch()` call and have a CDN cache the response. Which request shape makes that possible, and which GraphQL operation type can never use it?",
      choices: [
        {
          id: 'a',
          text: "GET, with the query and variables as query-string parameters — legal for `query` operations only. `mutation` (and `subscription`) can't use GET, since GET is defined for operations without side effects.",
        },
        { id: 'b', text: 'POST with a JSON body is the only cacheable shape, for any operation type, as long as `Cache-Control` is set.' },
        { id: 'c', text: 'Neither GET nor POST is cacheable for GraphQL; caching requires a persisted-query service in front of the API.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "The GraphQL-over-HTTP spec allows GET specifically for query operations, encoding `query`/`variables`/`operationName` as query-string parameters — which is what makes ordinary HTTP caching (CDNs, browser cache) apply the normal way. Mutations must use POST, since a mutation has side effects and GET is reserved for safe, cacheable requests.",
    },
  ],
};
