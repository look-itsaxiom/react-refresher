import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A `ProductGallery` component only reads `products` from props and maps them into `<img>` tags — no hooks, no event handlers, no browser APIs. A sibling `ZoomableImage` component uses `useState` to track zoom level and an `onWheel` handler. Which one needs `\'use client\'`?',
      choices: [
        { id: 'a', text: 'Both — any component that will eventually be visible in the browser needs the directive.' },
        {
          id: 'b',
          text: "Only ZoomableImage. ProductGallery has no state, effects, or browser APIs, so it can stay a Server Component; the directive marks a module boundary for code that needs to run again in the browser, not \"code that produces visible UI.\"",
        },
        { id: 'c', text: 'Neither — `\'use client\'` is only required at the root of the application.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "The test for the boundary is \"does this need to run again, in the browser, after the initial render\" — not \"will a user see it.\" Plenty of purely presentational components stay Server Components; only the one that needs useState/useWheel to keep working after the page loads needs `'use client'`.",
    },
    {
      id: 'q2',
      prompt:
        'A Server Component fetches a user record from an ORM and wants to pass it to a `\'use client\'` `ProfileCard`. The ORM returns a class instance with getter methods, not a plain object. What happens?',
      choices: [
        { id: 'a', text: 'It works fine — any object with the right fields is serializable.' },
        {
          id: 'b',
          text: 'React throws, because the value is a class instance (its prototype is not `Object.prototype`), not plain data — this is the same rule that rejects `Object.create(null)` objects and unregistered symbols. The fix is to pass a plain object built from the fields you need, e.g. `{ ...user }` or an explicit mapping.',
        },
        { id: 'c', text: 'It works, but the getters silently stop functioning on the client.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Only plain object literals (and the built-ins: Date, Map, Set, TypedArray, Promise) survive the boundary. ORM rows, framework response objects, and other class instances are a common source of this bug precisely because they look like plain data.',
    },
    {
      id: 'q3',
      prompt:
        'A `\'use client\'` component wants to render a Server Component conditionally, based on client state (e.g. only show `<Comments />` after the user clicks "Show comments"). Is this possible, and how?',
      choices: [
        {
          id: 'a',
          text: 'No — a Client Component can never have a Server Component anywhere in its output.',
        },
        {
          id: 'b',
          text: "Yes, but not by importing `<Comments />` directly inside the client module (that import would be resolved as client code). The Server Component parent renders `<Comments />` ahead of time and passes the already-rendered result down as a prop or `children`; the client component then decides, based on its own state, whether to render that prop.",
        },
        { id: 'c', text: 'Yes, by adding `\'use server\'` to the top of the client component\'s file.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "A Client Component can't import a Server Component, but it can receive one as an already-rendered value via props/children — the composition escape hatch from the first lesson. The client-side condition controls whether to render the prop it already has, not whether the server re-renders anything.",
    },
    {
      id: 'q4',
      prompt:
        'What was the actual mechanism behind CVE-2025-55182, the December 2025 RSC vulnerability, and what is the practical takeaway for a team running an RSC-based app?',
      choices: [
        {
          id: 'a',
          text: "It was a CSRF issue in Server Function form submissions, fixed by adding a token — the takeaway is to always validate the Origin header on mutations.",
        },
        {
          id: 'b',
          text: "It was insecure deserialization: a crafted Flight payload shaped like an internal promise-like \"chunk\" tricked react-server into invoking an attacker-controlled `then` handler during deserialization, giving unauthenticated RCE. The takeaway is to keep React and your framework's version current — deserializing a client-submitted payload back into live objects puts the deserializer's correctness on your attack surface regardless of your own validation.",
        },
        { id: 'c', text: 'It was a build-time supply-chain compromise of a popular npm package used by most RSC frameworks.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "The bug lived in how react-server resolved values during Flight payload deserialization, not in application code. It's a sharp illustration of why the serialization boundary matters even when your own Server Functions do everything right: the framework's deserializer is part of the trust boundary too.",
    },
    {
      id: 'q5',
      prompt:
        'A module exports a database client using a connection string from an environment variable. What is the most direct way to guarantee a future refactor can never accidentally import it into a Client Component?',
      choices: [
        { id: 'a', text: 'Name the file `db.server.ts` as a convention and rely on code review to catch violations.' },
        {
          id: 'b',
          text: "Add `import 'server-only'` at the top of the module, so importing it from anything in the client module graph is a build-time error, not a runtime surprise caught later.",
        },
        { id: 'c', text: "Wrap the connection string in `experimental_taintUniqueValue` and nothing else." },
      ],
      correctChoiceId: 'b',
      explanation:
        "`server-only` fails the build the moment the module graph shows this file reachable from client code — it stops the leak at the exact point a refactor would introduce it. Taint APIs protect a specific value from being passed toward the client even from code that's allowed to touch it; they solve a different problem and are still experimental as of September 2026.",
    },
    {
      id: 'q6',
      prompt:
        "A Server Component fetches a company's pricing tiers, which only change when the team deploys a config update, and renders them directly. Should this fetch use Next.js's `'use cache'`, and why or why not?",
      choices: [
        {
          id: 'a',
          text: "Yes — data that's fine as of the last deploy is exactly the case `'use cache'` (or a longer staleTime, if it were client-fetched with TanStack Query) is for: re-running the same read on every single request is wasted work when the true answer only changes on your own schedule.",
        },
        { id: 'b', text: "No — 'use cache' can only be applied to Client Components." },
        { id: 'c', text: "No — Server Components can never be cached; only Client Component data fetching supports caching." },
      ],
      correctChoiceId: 'a',
      explanation:
        "`'use cache'` targets exactly this shape: a server-side read whose true value doesn't change per request. It's the server-side analog of the staleTime judgment call from server-state libraries — the deciding question is \"how long is a cached answer still trustworthy,\" not whether caching is allowed in a given component type.",
    },
  ],
};
