import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'servers-serverless-edge-quiz',
  title: 'Quiz: Servers, serverless, and edge',
  questions: [
    {
      id: 'module-scope-across-requests',
      prompt:
        'A Lambda function does `let cachedClient; export const handler = async (event) => { cachedClient ??= createDbClient(); return use(cachedClient); }`, with `cachedClient` at module scope. What can you actually rely on here, in production?',
      choices: [
        { id: 'a', text: 'Every invocation gets a fresh module, so this never caches anything and is harmless but pointless.' },
        {
          id: 'b',
          text: "If two invocations land on the same warm instance, the second one reuses `cachedClient` for free; if they land on different instances (concurrent cold starts, or an instance that got retired), each pays to create its own. It's a valid optimization, never a correctness guarantee.",
        },
        { id: 'c', text: 'This crashes on the second request because module-scope state cannot survive between invocations.' },
        { id: 'd', text: 'It works identically to a long-running server, since Lambda always keeps exactly one instance running.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A serverless instance can survive between invocations it happens to serve, but you never control which instance gets which request, and instances come and go with demand and idle timeouts. Module-scope caching is a real, common optimization for a reused connection -- it just can\'t be the only path to correctness (unlike a long-running server, where "one process, many requests" is guaranteed).',
    },
    {
      id: 'edge-db-round-trip',
      prompt:
        'You move an API route from a regional serverless function (same region as its Postgres database) to a globally-distributed edge runtime, expecting lower latency for far-away users. The route\'s only real work is one query against that same single-region database. What is the likely outcome for a user on the opposite side of the world from that region?',
      choices: [
        { id: 'a', text: 'Uniformly faster, because edge compute is always faster than regional compute.' },
        {
          id: 'b',
          text: "About the same or slightly worse: the isolate starts fast and is close to the user, but the query still has to cross the same long distance to the database and back -- the edge hop is added on top of that trip, not instead of it.",
        },
        { id: 'c', text: 'Uniformly faster, because edge runtimes have no cold starts.' },
        { id: 'd', text: 'It fails outright, because edge runtimes cannot make database queries.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "This is the data-locality trap: edge placement only helps the parts of a request that stay near the user. If the bottleneck is a round trip to a single-region database, running the handler at the edge doesn't remove that round trip -- it can add a short local hop in front of the same long one. Cloudflare's Smart Placement and Vercel's regional functions exist specifically to let you put compute near the data instead of near the user when that's the actual bottleneck.",
    },
    {
      id: 'wintertc-portability',
      prompt:
        'A route handler is written as `(request: Request) => Promise<Response>`, using only `Request`, `Response`, `Headers`, `URL`, and `fetch` for any outbound calls -- no `node:fs`, no raw sockets. Why does this specific choice matter for where the route can later run?',
      choices: [
        { id: 'a', text: 'It doesn\'t matter -- any JS function can run on any JS runtime.' },
        {
          id: 'b',
          text: 'That set of APIs is exactly the WinterTC-standardized minimum common web platform surface that Workers, Deno Deploy, Vercel/Netlify Functions, and Node (18+) all implement, so the same handler runs unmodified across all of them; reaching for a Node-only API (`fs`, raw TCP) ties the handler to a Node-capable runtime.',
        },
        { id: 'c', text: 'It only matters for TypeScript type-checking, not for runtime behavior.' },
        { id: 'd', text: 'Request/Response only exist in browsers, so this handler cannot run on any server at all.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'WinterCG (now Ecma TC55 / WinterTC) standardizes exactly this common surface so server-side JS code can move between runtimes without a rewrite. Frameworks (Hono, Next.js Route Handlers, Nitro/h3, React Router\'s and TanStack Start\'s adapters) converge on `fetch`-shaped handlers for this reason -- it defers the "which platform" decision instead of baking it into the handler.',
    },
    {
      id: 'graceful-shutdown',
      prompt:
        'A Node API server on Railway handles a scale-down event: the platform sends `SIGTERM` and the process ignores it (no handler registered), continuing to accept new connections until the platform forcibly kills it moments later. What breaks, concretely?',
      choices: [
        { id: 'a', text: 'Nothing -- SIGTERM is purely advisory and safe to ignore.' },
        {
          id: 'b',
          text: 'Requests in flight when the kill happens are dropped mid-response (the client sees a connection reset or a truncated body), and any new connections accepted in that final window never get a real answer either.',
        },
        { id: 'c', text: 'The process automatically finishes all in-flight work before any forced kill, regardless of what the code does.' },
        { id: 'd', text: 'SIGTERM only affects serverless functions, never a long-running server.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A long-running server is expected to handle `SIGTERM` by stopping the acceptance of new connections, letting in-flight requests finish, and exiting -- within the grace period the platform allows before a forced kill. Skipping that handler means shutdown behavior is whatever the forced kill happens to interrupt, which is exactly the mid-response drop this question describes.',
    },
    {
      id: 'waituntil-purpose',
      prompt:
        "A Cloudflare Worker's handler does `ctx.waitUntil(writeAnalyticsEvent(request))` right before `return response`. What does this buy you that `await writeAnalyticsEvent(request)` before returning would not?",
      choices: [
        { id: 'a', text: "Nothing -- ctx.waitUntil and await behave identically." },
        {
          id: 'b',
          text: "The response is returned to the client immediately, without waiting for the analytics write to finish, while the platform still keeps the isolate alive long enough for that write to complete in the background.",
        },
        { id: 'c', text: "It guarantees the analytics write happens before the response is sent." },
        { id: 'd', text: "It makes the analytics write run on a different, dedicated server." },
      ],
      correctChoiceId: 'b',
      explanation:
        "`waitUntil` decouples 'work that should happen' from 'work the response has to wait on.' Without it, either you `await` and slow down every response by the logging/analytics latency, or you fire-and-forget and risk the instance being torn down before the write finishes. `waitUntil` tells the platform to keep the instance around for that promise without blocking the response on it.",
    },
    {
      id: 'scenario-matrix',
      prompt:
        'A webhook receiver must acknowledge the caller within a couple of seconds (the caller times out and retries otherwise) but then needs to do 30 seconds of real work per event (re-encode an uploaded file, say). Which shape fits, and why?',
      choices: [
        { id: 'a', text: 'A single serverless function that does the ack and the 30 seconds of work in one invocation, since serverless scales automatically.' },
        {
          id: 'b',
          text: "A function/edge handler that validates the payload, enqueues the work (a queue, or a durable task), and returns the ack immediately -- with the actual 30-second job run by a worker or a long-running server designed for sustained work, not by the request handler itself.",
        },
        { id: 'c', text: 'An edge isolate, because isolates start fastest.' },
        { id: 'd', text: 'None of the three shapes can handle this; it requires a different architecture entirely.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "The ack and the real work have different constraints: the ack needs low latency and no state, which any of the three shapes can do; the 30-second job needs sustained execution that a request/response handler in a serverless or edge model isn't built to hold open. Splitting them -- ack fast, hand the real work to a queue-backed worker or a long-running server -- is the standard webhook pattern, and it's the same instinct as `waitUntil`, scaled up: don't make the caller wait on work the response doesn't need.",
    },
  ],
};
