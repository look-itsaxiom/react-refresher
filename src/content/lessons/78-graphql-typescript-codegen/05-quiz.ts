import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        "A component receives `data.user` from a query that selects `{ id name }` on `User`, and `User` has thirty fields in the schema. A teammate annotates the prop with the schema's generated `User` type instead of the operation's generated `GetUserQuery['user']` type. What goes wrong?",
      choices: [
        { id: 'a', text: 'Nothing — the schema type is a superset, so it always type-checks against real data.' },
        {
          id: 'b',
          text: "The component's prop type now claims access to all thirty fields, so the compiler won't catch a call site that reads a field the query never selected — the exact drift codegen exists to prevent, reintroduced by using the wrong generated type.",
        },
        { id: 'c', text: 'The build fails immediately, because the schema type and the operation type are structurally incompatible.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Codegen emits two different kinds of types for a reason: the schema type describes everything a field *could* return; the operation type describes exactly what one query *did* select. Annotating with the schema type silently widens the contract back to 'anything on User', which defeats the entire point of generating per-operation result types — a field access that would fail at runtime (because it wasn't fetched) now passes the type checker.",
    },
    {
      id: 'q2',
      prompt:
        'A schema adds a custom scalar `Money` with no entry in the codegen config\'s `scalars` map. What happens to every generated field typed `Money`, and what is the actual risk?',
      choices: [
        { id: 'a', text: 'Codegen fails the build immediately, refusing to generate anything until the scalar is mapped.' },
        {
          id: 'b',
          text: "Those fields are typed `unknown` (or `any`, depending on config) with no compile error anywhere, so a component can silently do `price.toFixed(2)` on what's really a string, and the mistake surfaces only at runtime.",
        },
        { id: 'c', text: 'Codegen infers the runtime type automatically by sampling actual responses during the build.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "An unmapped custom scalar degrades to `unknown`/`any` with no warning, which is the opposite of what you want from a type-safety pipeline: instead of failing loudly at the point of the missing config, it fails silently at every call site, arbitrarily far downstream. Treat a new custom scalar in the schema as something that needs a `scalars` config entry before its fields are trustworthy.",
    },
    {
      id: 'q3',
      prompt:
        "An operation selects a field typed as an interface (`node: Node`) with two inline fragments, `... on User { name }` and `... on Post { title }`, but no shared fields outside the fragments. A component does `if (result.node.__typename === 'User') { result.node.name }`. Why does this type-check, and what would happen if the component checked `result.node.__typename === 'Comment'` instead (a type that exists in the schema but wasn't one of the two fragments)?",
      choices: [
        {
          id: 'a',
          text: "It type-checks because `__typename` is a literal-typed discriminant on each union member, and TypeScript narrows `result.node` to the `User` branch inside that check; comparing against `'Comment'` is a type error, because `'Comment'` isn't one of the union's literal `__typename` values — the operation never selected it.",
        },
        { id: 'b', text: "It type-checks only because TypeScript treats all string comparisons on `__typename` as `boolean`, regardless of the compared value." },
        { id: 'c', text: "Both comparisons type-check identically; `__typename` is typed as `string` on every generated type." },
      ],
      correctChoiceId: 'a',
      explanation:
        "The generated result type for `node` is a union of exactly the fragments the operation selected, each carrying its own literal `__typename`. That's a closed set determined by the query, not by the full schema — so comparing against a type the query never asked about ('Comment') is caught at compile time, which is exactly the value of generating from operations instead of from the schema's full interface/union declaration.",
    },
    {
      id: 'q4',
      prompt:
        "A team enables `client-preset`'s fragment masking. A page component spreads a colocated `UserCard_user` fragment into its query and passes the fragment's data straight down to `<UserCard user={data.user} />`. Inside `UserCard`, before calling `useFragment(UserCard_userFragment, user)`, the component tries `user.avatarUrl` directly. What happens, and why is that the intended behavior rather than a bug?",
      choices: [
        { id: 'a', text: "It works fine — masking only affects runtime serialization, not the TypeScript types." },
        {
          id: 'b',
          text: "It's a type error: the masked type exposes no fields directly, only an opaque brand that `useFragment` can unwrap, so reaching into it before unwrapping fails to compile — which is intentional, because it's what actually enforces that a component's data dependencies stay declared through its own fragment rather than assumed from a parent's shape.",
        },
        { id: 'c', text: "It's a runtime error only — TypeScript can't express opacity, so this always type-checks and fails when rendered." },
      ],
      correctChoiceId: 'b',
      explanation:
        "Fragment masking's entire value is a compile-time guarantee: a component that owns a fragment is the only thing that can read its data, via `useFragment`. That forces every consumer of `UserCard`'s data to go through `UserCard`'s own declared fragment shape, so a later change to `UserCard`'s fragment (adding or removing a field) can't accidentally break a parent that was reaching in directly — because reaching in directly was never possible.",
    },
    {
      id: 'q5',
      prompt:
        'A schema registry (GraphQL Hive or Apollo GraphOS) flags a proposed change — removing a field that a `graphql-inspector` diff classifies as "breaking" against the last published schema — as safe to merge, based on usage reporting. What did usage reporting most likely show, and what real risk remains even so?',
      choices: [
        {
          id: 'a',
          text: 'It showed that no client has queried that field in a meaningful recent window, so the technically-breaking change has no live blast radius right now; the residual risk is a client that queries rarely (a batch job, a rarely-visited page) whose traffic window didn\'t overlap the reporting period.',
        },
        { id: 'b', text: "It showed the field was never part of the schema's SDL, so `graphql-inspector` misclassified a no-op as breaking." },
        { id: 'c', text: 'Usage reporting only tracks server-side resolver latency, not which fields clients select, so it cannot inform this decision at all.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "Usage reporting turns 'this is a breaking change per the spec' into 'this is a breaking change with observed traffic' — a real risk assessment instead of a binary gate. It's still probabilistic: a field genuinely unused in the observed window can still be depended on by a low-frequency client the window didn't catch, which is why usage-informed 'safe to merge' calls are a judgment aid, not a guarantee.",
    },
    {
      id: 'q6',
      prompt:
        "A server adopts a strict persisted-documents allowlist: it executes only query text with a hash present in a deployed manifest, rejecting everything else. A frontend engineer edits a `.graphql` file, tests locally against a dev server, then deploys — and production immediately rejects the new query with a 'document not found' error. What went wrong, and what does this buy the team in exchange for that extra step?",
      choices: [
        { id: 'a', text: "The new query's hash was never added to the deployed manifest, because the deploy shipped the new client bundle without also shipping the codegen-produced manifest update to the server; the fix is treating the manifest as part of the deploy, not an afterthought." },
        { id: 'b', text: 'Persisted-document manifests expire after 24 hours regardless of deployment, so this is expected and requires no process change.' },
        { id: 'c', text: 'The dev server and production server must run different GraphQL implementations, which is the actual cause.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "A strict allowlist means the client and the server must ship the same manifest in lockstep — the client's build swaps document text for an id, and the server can only resolve that id if its own copy of the manifest already contains it. In exchange for that coordination cost, production only ever executes query text that went through a reviewed build, closing off arbitrary-query abuse and shrinking every request to an id plus variables.",
    },
  ],
};
