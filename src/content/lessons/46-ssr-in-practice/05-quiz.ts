import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'ssr-in-practice-quiz',
  title: 'Quiz: SSR in practice',
  questions: [
    {
      id: 'module-scope-user',
      prompt:
        'A Node SSR server handles many requests concurrently on one process. A loader does `let currentUser; currentUser = await getUser(req); ... return render(currentUser)`, with `currentUser` declared at module scope, outside the loader function. What is the actual risk, in production, under real traffic?',
      choices: [
        { id: 'a', text: "None -- each request gets its own copy of the module's variables automatically." },
        {
          id: 'b',
          text:
            "One request's `await` can yield to the event loop while another request's loader runs and overwrites `currentUser`, so a response can render a different user's data.",
        },
        { id: 'c', text: 'It only matters if the server restarts, which resets the variable anyway.' },
        { id: 'd', text: 'It is slower than a request-scoped variable but not incorrect.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A single module instance is shared by every request that process handles. Anything stored at module scope -- not passed as a function argument or held in a request-scoped container -- is shared state, and an `await` anywhere in between is a point where another request can interleave and clobber it. This is the same class of bug `React.cache()` and `AsyncLocalStorage` exist to prevent: memoization scoped to one request, not the process.',
    },
    {
      id: 'shell-error-status',
      prompt:
        'Using `renderToPipeableStream`, the shell (everything outside a `Suspense` boundary) has already been flushed to the response with a 200 status. A component inside a `Suspense` boundary deep in the tree then throws. What can your server actually do about the HTTP status code at this point?',
      choices: [
        { id: 'a', text: 'Nothing -- the 200 is already sent; the boundary\'s fallback renders in place and the failure is only visible if you log it server-side.' },
        { id: 'b', text: 'Call `res.status(500)` from inside the failing component to retroactively change it.' },
        { id: 'c', text: 'React automatically converts the response to a 500 for you.' },
        { id: 'd', text: 'The stream aborts and the browser shows a network error instead of any HTML.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'Once headers are sent, the status code is fixed. `onShellError` is your last chance to choose a real error status, because it fires before anything is flushed; `onError` (for failures after the shell) can only log -- the boundary\'s fallback is the only thing the user sees for that section.',
    },
    {
      id: 'why-not-json-stringify',
      prompt:
        'Why is `<script>window.__DATA__ = ${JSON.stringify(loaderData)}</script>` unsafe to ship as-is, given `loaderData` can contain arbitrary user content (e.g. a display name)?',
      choices: [
        { id: 'a', text: 'JSON.stringify is too slow for production use.' },
        {
          id: 'b',
          text:
            'If a string value contains "</script>", the browser\'s HTML parser closes the tag early, letting the rest of the "JSON" be parsed as new markup/script -- an XSS hole, independent of any JS-level escaping.',
        },
        { id: 'c', text: 'JSON.stringify cannot serialize strings at all.' },
        { id: 'd', text: 'It only matters if `loaderData` is larger than 1MB.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The HTML parser looks for "</script>" as plain text while scanning a script element\'s content, before any JavaScript ever runs -- it doesn\'t know or care that the bytes are "inside a JSON string" from JS\'s point of view. A hardened serializer escapes `<`, `>`, `&`, and the JS line/paragraph separators so the dangerous sequence can never appear literally in the output.',
    },
    {
      id: 'edge-vs-node',
      prompt:
        'A route loader calls a database client that opens a raw TCP socket, and also reads a local file with `fs.readFileSync` for a fallback config. You want to deploy this route to an edge runtime (Vercel Edge, Cloudflare Workers) for lower latency. What has to change first?',
      choices: [
        { id: 'a', text: 'Nothing -- edge runtimes support the full Node.js API, just with a faster cold start.' },
        {
          id: 'b',
          text:
            'Both the raw-socket DB client and the `fs` call need to go -- edge runtimes expose only Web-standard APIs (fetch, Request/Response, Streams), not `fs` and usually not raw TCP sockets.',
        },
        { id: 'c', text: 'Only the `fs` call needs to change; raw sockets work fine at the edge.' },
        { id: 'd', text: 'Edge runtimes are strictly slower, so this is not a real tradeoff to consider.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Edge runtimes trade the full Node API for Web-standard APIs plus lower cold-start latency and execution near the user. No `fs`, and most raw-socket database drivers don\'t work there -- which is why HTTP-based ("edge-compatible") database drivers exist as a category. Check the framework\'s per-route runtime setting before assuming a loader is portable.',
    },
    {
      id: 'cache-control-public-bug',
      prompt:
        'A route renders a page showing the signed-in user\'s account balance. Its response sets `Cache-Control: public, max-age=300`. What is the concrete failure mode?',
      choices: [
        { id: 'a', text: 'Nothing bad happens -- `public` only affects browser caching, never shared/CDN caches.' },
        {
          id: 'b',
          text:
            "A shared cache (CDN, corporate proxy) is allowed to store this response and serve it to a *different* user for up to 5 minutes -- one user's balance becomes visible to the next visitor who hits the same URL.",
        },
        { id: 'c', text: 'The page will simply never be cached because it contains dynamic data.' },
        { id: 'd', text: 'max-age is ignored for HTML responses, only for static assets.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`public` is an explicit statement that a *shared* cache may store the response for reuse across different users. Personalized responses must be `private` (browser-only caching) or vary the cache key by identity (`Vary: Cookie`) -- getting this header wrong is a real, shipped class of data-leak bug, not a theoretical one.',
    },
    {
      id: 'dehydrate-vs-loader-data',
      prompt:
        'A route already fetches the day\'s orders in its loader and passes them to the component as `loaderData.orders`. The component also uses TanStack Query for the same data so it can refetch on focus and get cache invalidation elsewhere in the app. Why bother with `dehydrate`/`hydrate` at all instead of just calling `useQuery` on the client and letting it fetch once, right after hydration?',
      choices: [
        { id: 'a', text: "There's no real benefit; `dehydrate`/`hydrate` is purely cosmetic." },
        {
          id: 'b',
          text:
            "Without hydrating the query cache, useQuery on the client has no cached entry yet, so it refetches immediately after the SSR response arrives -- duplicating the loader's fetch. Hydrating the snapshot into the query cache first means the client believes the data is already fresh (per `staleTime`), skipping that refetch while keeping all of Query's later invalidation/refetch behavior.",
        },
        { id: 'c', text: 'dehydrate/hydrate is only needed when there is no server at all.' },
        { id: 'd', text: 'It replaces the loader entirely -- you would delete the loader once you add this.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The loader gets the data to the server-rendered HTML; dehydrate/hydrate gets that same data into the client library\'s cache so it does not immediately re-request it. Skipping this step is a common cause of "why does this page fetch everything twice" in loader+Query stacks.',
    },
  ],
};
