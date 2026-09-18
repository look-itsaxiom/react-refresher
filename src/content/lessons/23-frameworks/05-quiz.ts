import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        "A team is building a content site where most pages are Server Components by default, and they want the framework to own caching decisions rather than configuring a separate data-fetching library. Which framework's model fits that intent most directly?",
      choices: [
        { id: 'a', text: 'Next.js App Router, since RSC is the default rendering model and Cache Components make caching an explicit, framework-owned layer via "use cache".' },
        { id: 'b', text: 'React Router 8 framework mode, since loaders are the most explicit place to fetch data.' },
        { id: 'c', text: 'TanStack Start, since createServerFn is the newest server primitive.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'Next.js is the only one of the three where RSC is the default rendering model for every route, and its Cache Components model (opt-in via "use cache" as of Next.js 16) is a framework-owned caching layer, not something left to a separate data library the way React Router and TanStack Start typically leave it.',
    },
    {
      id: 'q2',
      prompt:
        'A team upgrading a Next.js 14 app to Next.js 16 finds that pages which used to be cached automatically are now rendered fresh on every request. What changed, and what fixes it?',
      choices: [
        {
          id: 'a',
          text: 'Next.js 16 removed caching entirely; there is no way to cache a page anymore.',
        },
        {
          id: 'b',
          text: 'Caching flipped from implicit-by-default to opt-in: enabling `cacheComponents` and adding `"use cache"` to the functions/components that should be cached restores the caching behavior, deliberately, per unit.',
        },
        { id: 'c', text: 'Nothing changed in caching; the regression must be an unrelated bug.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Next.js 16 replaced the old implicit full-route caching (and the experimental_ppr flag) with Cache Components: caching is off by default and turned on deliberately with "use cache" on the specific function, component, or file that should be cached, with Partial Prerendering falling out of that model.',
    },
    {
      id: 'q3',
      prompt:
        'A form needs to submit data and have every loader on the current page refresh with the latest data afterward, using React Router 8 framework mode. What triggers that refresh?',
      choices: [
        {
          id: 'a',
          text: "Nothing automatic — the developer must manually call each route's loader again after the action resolves.",
        },
        {
          id: 'b',
          text: "Submitting via `<Form>` or `useFetcher().submit()` calls the matched route's `action`, and React Router automatically revalidates every loader currently on the page afterward.",
        },
        { id: 'c', text: 'The page has to fully reload for new loader data to appear.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Revalidation after an action is automatic in React Router's framework mode: the action export runs, and every loader for the currently matched routes reruns without a manual trigger or a full page reload. This is the same principle this lesson's loader/action exercise models with runAction calling runNavigation again.",
    },
    {
      id: 'q4',
      prompt:
        "TanStack's July 2026 post \"We Stopped Using RSC on TanStack.com\" explains why they pulled RSC from their own site. What was the core problem they described?",
      choices: [
        {
          id: 'a',
          text: 'RSC was too slow at build time to be practical for a content-heavy site.',
        },
        {
          id: 'b',
          text: "Route components ended up receiving a mix of server-only and client-serializable values, and ordinary content changes turned into questions about which side of the server/client boundary something belonged on.",
        },
        { id: 'c', text: 'RSC required a paid hosting plan that TanStack was unwilling to use.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "TanStack's postmortem is specifically about the boundary-tracking cost — the same cost this track's earlier lessons on Server Components and Server Functions cover in depth. It's a lived engineering-cost report, which is why TanStack Start treats RSC as optional and unproven rather than as the framework's default.",
    },
    {
      id: 'q5',
      prompt:
        "Next.js 16 renamed `middleware.ts` to `proxy.ts`. A developer starts putting a database query for personalization logic inside `proxy.ts` because \"it runs before every request anyway.\" What's the problem with that?",
      choices: [
        {
          id: 'a',
          text: "There's no problem — proxy.ts is a general-purpose place for any per-request logic now.",
        },
        {
          id: 'b',
          text: 'The rename exists specifically to signal that this file is a network-edge concern (redirects, rewrites, auth gating) rather than a place for business logic like database queries — putting a DB call there works technically but fights the boundary the rename was meant to clarify.',
        },
        { id: 'c', text: 'proxy.ts cannot make any asynchronous calls at all.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "The middleware-to-proxy rename didn't change the underlying primitive's capabilities — it changed the name specifically to discourage exactly this pattern, communicating that the file is for edge/network concerns, not general application logic that belongs in a route's Server Component or Server Function instead.",
    },
    {
      id: 'q6',
      prompt:
        'A team wants to avoid being tied to a specific hosting provider\'s infrastructure and plans to self-host on plain Node containers across multiple cloud providers over the app\'s lifetime. All else being equal, which factor should weigh most in their framework choice?',
      choices: [
        {
          id: 'a',
          text: "Next.js's App Router is the safest choice regardless, since it's the most widely adopted framework.",
        },
        {
          id: 'b',
          text: "React Router 8 framework mode or TanStack Start, since both are Vite-based and ship as standard Node/edge-runtime builds with host adapters, rather than being most efficient on one vendor's infrastructure the way Next.js's caching and image optimization defaults assume Vercel unless reconfigured.",
        },
        { id: 'c', text: "It doesn't matter — all three frameworks produce identical deployment artifacts." },
      ],
      correctChoiceId: 'b',
      explanation:
        "Deployment portability is exactly where React Router 8 and TanStack Start's Vite-based, adapter-driven builds differ from Next.js's Vercel-optimized defaults. Next.js self-hosts fine, but some caching backends and defaults assume Vercel's infrastructure unless explicitly configured otherwise — worth weighing when multi-provider portability is a stated goal.",
    },
  ],
};
