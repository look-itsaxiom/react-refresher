import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A product team is building a public API that an unknown number of third-party developers (various languages, various runtimes) will integrate against over the next several years. They ask whether tRPC would give them a faster path than REST + OpenAPI. What do you tell them?',
      choices: [
        { id: 'a', text: "Yes — tRPC's type inference works over HTTP for any client, the same way OpenAPI-generated clients do." },
        {
          id: 'b',
          text: "No — tRPC's core value is importing the server's inferred TypeScript types directly into the client's build, which requires the client to be a TypeScript project sharing a repo or package with the server. An unknown set of third-party integrators in arbitrary languages has no way to consume that; REST + OpenAPI is the shape that scales to unknown, heterogeneous consumers.",
        },
        { id: 'c', text: "It depends only on request volume — tRPC and REST have identical scaling characteristics for public traffic." },
      ],
      correctChoiceId: 'b',
      explanation:
        "tRPC's entire pitch is skipping a schema by sharing TypeScript types at the source level, which structurally requires the consumer to be inside the same TypeScript build graph. A public API with unknown, polyglot consumers can't do that — it needs a stable, documented, language-agnostic contract, which is exactly what REST + OpenAPI (or oRPC/ts-rest, which generate one) provides.",
    },
    {
      id: 'q2',
      prompt:
        'A dashboard renders a list of 50 orders, each showing its customer\'s name. The GraphQL resolver for `Order.customer` does `db.customers.findOne({ id: order.customerId })` with no batching. What happens, and what\'s the fix?',
      choices: [
        { id: 'a', text: "Nothing unusual — GraphQL resolvers for sibling list items are deduplicated automatically by the executor." },
        {
          id: 'b',
          text: 'This is the N+1 problem: fetching 50 orders triggers 50 separate customer lookups, one per resolver invocation. The fix is a DataLoader-style batching cache: each `load(customerId)` call registers a key instead of hitting the database immediately, and a scheduler flushes every key registered in the same tick into one batched query.',
        },
        { id: 'c', text: 'This only happens with REST, not GraphQL, because GraphQL resolvers share a single database connection.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "The GraphQL executor calls a resolver once per parent object by design — that's what makes per-object logic possible at all. Without batching, sibling resolvers each do their own fetch. DataLoader's trick is to defer the actual fetch until the end of the current tick, by which point every resolver that's going to ask for a customer this pass already has, so one batched call replaces N separate ones.",
    },
    {
      id: 'q3',
      prompt:
        'A security review flags that your production GraphQL API has introspection fully enabled. A teammate argues this is fine because "the schema isn\'t secret, it\'s just field names." Do you push back?',
      choices: [
        {
          id: 'a',
          text: "Yes — introspection isn't primarily about secrecy, it's reconnaissance: it hands an attacker the complete field/argument/type map needed to construct maximally expensive queries (deep nesting, alias abuse, list arguments) without any guesswork. Disabling it in production, paired with persisted queries, closes off ad-hoc query construction entirely.",
        },
        { id: 'b', text: "No — introspection only exposes documentation comments, never the actual field or argument names." },
        { id: 'c', text: "No — disabling introspection would also break every legitimate client's ability to send queries." },
      ],
      correctChoiceId: 'a',
      explanation:
        "Introspection isn't a secrecy control by itself, but it dramatically lowers the cost of an attack: instead of guessing field names and argument shapes, an attacker (or a scraping bot) gets the full graph handed to them, including exactly which fields are lists and take size arguments — the inputs a cost-based attack needs. Legitimate clients don't need runtime introspection to send queries; they need the schema at development/codegen time, which a dev/staging environment (or the persisted-query registration step) already covers.",
    },
    {
      id: 'q4',
      prompt:
        'A query includes `{ a: report(range: FULL) b: report(range: FULL) c: report(range: FULL) ... }` with the same expensive field aliased 40 times. Your server enforces a maxDepth of 5. Does depth limiting stop this query?',
      choices: [
        { id: 'a', text: "Yes — repeating the same field 40 times necessarily increases nesting depth past any reasonable limit." },
        {
          id: 'b',
          text: "No — depth limiting only bounds how deeply nested a query is, and this query is flat (all 40 aliases sit at the same top-level depth). Stopping it requires cost/complexity analysis, which sums each alias's field cost independently and can reject the query on total cost even though its depth is 1.",
        },
        { id: 'c', text: "No, and no static defense catches this — only runtime rate limiting after the query has already executed can." },
      ],
      correctChoiceId: 'b',
      explanation:
        "Depth and cost are independent axes of abuse. Depth limiting catches deep recursive nesting; it does nothing against a wide, flat query that repeats an expensive field via aliases, since aliasing doesn't add nesting. That's precisely why a cost analyzer has to walk every selection — including each alias as its own entry — rather than assuming same-named fields can be collapsed.",
    },
    {
      id: 'q5',
      prompt:
        "Your company's catalog team and reviews team each own a GraphQL subgraph, composed by an Apollo Federation router into one public schema. The reviews team wants to add a `Review.helpfulCount` field. Does shipping this field require a coordinated deploy with the catalog team?",
      choices: [
        {
          id: 'a',
          text: "No — federation's whole point is that each subgraph deploys independently. The reviews team ships their subgraph change; the router picks it up (typically validated against the composed schema by a registry check before rollout), and catalog's subgraph is untouched. Coordination is only needed if the change affects a shared entity's `@key` fields or a type both subgraphs contribute to.",
        },
        { id: 'b', text: 'Yes — federation requires every subgraph to redeploy together, since the composed schema is built once at gateway startup.' },
        { id: 'c', text: "It depends on whether the field is nullable — non-null fields always require a coordinated deploy in Federation 2." },
      ],
      correctChoiceId: 'a',
      explanation:
        "Independent subgraph ownership and deployment is the core value federation provides at org scale — each team's schema changes are validated against the composed graph (schema registry / composition checks) without requiring every other subgraph to redeploy in lockstep. Coordination becomes necessary specifically around shared entities (fields referenced via `@key` across subgraphs), not for an unrelated field addition.",
    },
    {
      id: 'q6',
      prompt:
        "A team is building an internal admin tool: one React app, one Node backend, both in the same TypeScript monorepo, used only by employees. They're debating GraphQL vs. tRPC. Which factors actually favor tRPC here, and which commonly-cited GraphQL benefit doesn't apply?",
      choices: [
        {
          id: 'a',
          text: "tRPC wins on setup cost: one client, one TypeScript codebase means there's no schema to design, no codegen step, and no resolver/N+1 concerns to manage — the types are just inferred. GraphQL's multi-client, graph-shaped flexibility is the benefit that doesn't apply, since there's only one client shaping only one app's queries.",
        },
        { id: 'b', text: "GraphQL still wins here because only GraphQL can provide end-to-end type safety between a React app and a Node backend." },
        { id: 'c', text: "Neither applies — a single-app internal tool should always use REST regardless of the TypeScript setup." },
      ],
      correctChoiceId: 'a',
      explanation:
        "GraphQL's signature advantages — letting independent clients each shape their own queries against a shared graph, and decoupling client release cycles from server ones — are moot when there's exactly one client and one team. tRPC's end-to-end inferred types deliver the same practical type safety with none of the schema/resolver/N+1 machinery, precisely because the monorepo constraint that makes tRPC awkward for public APIs is exactly satisfied here.",
    },
  ],
};
