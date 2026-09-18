import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A `<UserAvatar>` component declares `fragment UserAvatarFragment on User { avatarUrl }` and a sibling `<UserName>` declares `fragment UserNameFragment on User { name }`. A parent query spreads both. With fragment masking (Relay, or Apollo Client with masked fragments) enabled, can `<UserAvatar>` read `user.name` off the data its own fragment gave it?',
      choices: [
        {
          id: 'a',
          text: "Yes — masking only hides fields at the network layer; any component can still read any field present on the object at runtime.",
        },
        {
          id: 'b',
          text: "No — the type masking generates for `<UserAvatar>`'s fragment result only exposes `avatarUrl`, even though `name` is present in the actual object the parent query fetched; reading it is a type error, by design.",
        },
        { id: 'c', text: "It depends only on whether `<UserName>` is rendered as a sibling in the same tree." },
      ],
      correctChoiceId: 'b',
      explanation:
        "Fragment masking's entire point is preventing exactly this: a component's typed view of the data is restricted to what its own fragment selected, so it can never depend on a field that happens to be present because some other component, or the parent query, fetched it nearby. The restriction is enforced by the generated types, not by anything actually missing from the runtime object.",
    },
    {
      id: 'q2',
      prompt:
        'A field has both `@skip(if: $shouldSkip)` and `@include(if: $shouldInclude)`, and a request sets both variables to `true`. Is the field included in the response?',
      choices: [
        { id: 'a', text: 'Yes — `@include(if: true)` overrides `@skip` whenever both resolve to true.' },
        { id: 'b', text: "No — `@skip` takes precedence over `@include` whenever both are present on the same selection, regardless of `@include`'s value." },
        { id: 'c', text: "It's a validation error to put both directives on the same selection." },
      ],
      correctChoiceId: 'b',
      explanation:
        "The spec's directive-precedence rule is `@skip` wins. It's legal to have both on one selection, and a `@skip(if: true)` drops the field no matter what `@include` says — a detail that matters once a client is building queries with conditional selections generated from more than one source.",
    },
    {
      id: 'q3',
      prompt:
        'A `posts` table gets a burst of inserts while a client is paging through it with `skip`/`take` offset arguments, five pages in. What symptom does that client see, and does switching that same field to Relay-style `first`/`after` cursor pagination fix it without any other change?',
      choices: [
        {
          id: 'a',
          text: 'The client sees duplicate or skipped rows across pages, because the offset a later page requests no longer points at the same logical position once rows shift ahead of it; cursor pagination fixes this because the cursor pins a position relative to a specific row, not a row count.',
        },
        { id: 'b', text: "There's no symptom either way — offset and cursor pagination have identical behavior under concurrent writes." },
        { id: 'c', text: "The client sees a GraphQL validation error, since the schema rejects `skip`/`take` once the table changes underneath a paging session." },
      ],
      correctChoiceId: 'a',
      explanation:
        "Offset pagination's `skip: N` means \"skip N rows in current sort order,\" which silently shifts when rows are inserted or deleted ahead of that position. A cursor encodes \"after this specific row\" (a keyset value underneath), which stays correct regardless of how many rows land elsewhere in the table — that's the concrete bug cursor pagination is designed to prevent, not just a style preference.",
    },
    {
      id: 'q4',
      prompt:
        "A junior teammate proposes a `createPost(title: String!, body: String!): Post!` mutation — no input object, no payload type, returns the bare `Post`. What's the concrete cost of that shape once the schema has to evolve, and what does the idiomatic `input`/payload convention buy back?",
      choices: [
        {
          id: 'a',
          text: "Almost nothing — GraphQL mutations are naturally backward compatible regardless of argument shape, and payload types are purely a stylistic preference some teams use.",
        },
        {
          id: 'b',
          text: "Adding a fourth argument later is still non-breaking either way, so there's no real difference between the two shapes.",
        },
        {
          id: 'c',
          text: "A bare `Post!` return has no room for a validation failure that isn't a thrown/top-level error — there's no field to carry `userErrors` — and a growing argument list has no single place to add a required-but-optional-in-practice field the way an `input` type's own optional fields do. The `input`/payload convention exists specifically to keep both of those extensible.",
        },
      ],
      correctChoiceId: 'c',
      explanation:
        "The input object isn't about argument count today — it's that an `input` type can grow new optional fields cleanly, the same way an output type can. A payload type is what gives a mutation somewhere to put `userErrors` for expected, displayable failures instead of forcing every validation problem through the top-level `errors` array, which is meant for unexpected failures.",
    },
    {
      id: 'q5',
      prompt:
        'A team wants to ship `@defer` on a slow field of an otherwise-fast dashboard query today, targeting an Apollo Client 3 web app talking to Apollo Server. Is this "just use a feature in the spec," the way adding a new scalar argument would be?',
      choices: [
        {
          id: 'a',
          text: 'Yes — `@defer` has been part of the released base GraphQL specification since 2023, so any spec-compliant client and server pair supports it.',
        },
        {
          id: 'b',
          text: "No — as of September 2026, `@defer`/`@stream` are still an accepted RFC in active development, not the released base spec; it works because both Apollo Client and Apollo Server specifically implement that RFC, not because it's guaranteed by \"the GraphQL spec\" the way argument handling is.",
        },
        { id: 'c', text: "No — `@defer` requires GraphQL subscriptions and a WebSocket transport, which this stack doesn't have." },
      ],
      correctChoiceId: 'b',
      explanation:
        "`@defer`/`@stream` are real and usable today with a matched client/server pair that both implement the RFC, but betting on them is a bet on that specific pairing, not on universal spec compliance the way a stable, released feature would be. Calling it \"just a spec feature\" overstates how settled the multipart-response transport underneath it actually is.",
    },
    {
      id: 'q6',
      prompt:
        'A mobile client wants a specific dashboard `query` to be servable from a CDN edge cache. The team is already using Automatic Persisted Queries. What request shape gets them CDN caching, and would the same approach work if this were a `mutation` instead?',
      choices: [
        {
          id: 'a',
          text: 'Send the persisted query hash as a `GET` request (query string or the APQ extensions parameter) so ordinary HTTP caching applies; the same approach would not work for a mutation, since GET is reserved for operations without side effects and mutations must use POST.',
        },
        { id: 'b', text: 'Send it as a `POST` with `Cache-Control: public` set on the request; APQ makes POST responses cacheable the same way GET responses are.' },
        { id: 'c', text: 'CDN caching requires bypassing GraphQL entirely and exposing the dashboard data through a plain REST endpoint instead.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "GET is what makes a GraphQL response look like any other cacheable HTTP resource to a CDN or the browser cache — and the GraphQL-over-HTTP spec restricts GET to `query` operations specifically because GET is defined for safe, side-effect-free requests. Persisted queries make the GET URL short and stable (a hash, not the full query text) which is what makes it practical to cache-key on in the first place; none of that changes the rule that a mutation has side effects and must go over POST.",
    },
  ],
};
