import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A five-person startup, pre-product-market-fit, needs to ship an authenticated SaaS dashboard fast, with a team that only knows React and plain Vite. They read that Next.js has the largest ecosystem and pick it for that reason alone. What is the strongest objection to that reasoning, independent of whether Next.js turns out fine?',
      choices: [
        {
          id: 'a',
          text: "Ecosystem size predicts hiring ease and answer availability, but it doesn't predict this team's actual day-90 experience — and State of JS 2025 shows Next.js's satisfaction trailing the category leader by a wide margin, so usage and fit are different questions the team never asked separately.",
        },
        { id: 'b', text: 'Next.js cannot build an authenticated dashboard, so the choice is simply wrong regardless of team size.' },
        { id: 'c', text: 'Ecosystem size is irrelevant to any framework decision and should never factor in.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "Usage and satisfaction are both real signals, but they answer different questions: usage tells you about hiring and community support; satisfaction tells you how the framework will feel to the people building on it. Picking on usage alone skips straight past the requirements-and-constraints steps of the decision procedure.",
    },
    {
      id: 'q2',
      prompt:
        'A team has a hard constraint: "must not be locked into a single hosting vendor." They\'re evaluating Next.js, whose most-tuned feature set (ISR, on-demand revalidation, image optimization) is built and tuned against one platform. What is the accurate way to weigh this?',
      choices: [
        {
          id: 'a',
          text: 'Next.js is automatically disqualified — there is no way to run it anywhere else.',
        },
        {
          id: 'b',
          text: 'OpenNext exists specifically to run Next.js on other infrastructure (AWS Lambda/CloudFront, Cloudflare Workers), but it is an unofficial adapter layer, not the default optimized path — so the team should budget real integration and maintenance time for it, or treat the vendor-neutral hard constraint as ruling Next.js out entirely if that budget doesn\'t exist.',
        },
        { id: 'c', text: 'This is not actually a real risk, since every framework in this category has identical hosting flexibility.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "A hard constraint eliminates options that can't satisfy it — but \"can't satisfy it without an adapter layer\" is different from \"structurally can't.\" The honest move is pricing in the adapter's real cost, not treating an unofficial workaround as equivalent to a vendor-neutral-by-design option like React Router 8 or TanStack Start.",
    },
    {
      id: 'q3',
      prompt:
        "A team is migrating a Vite SPA (React Router library mode) to framework mode. Someone suggests migrating the authenticated billing page first, reasoning \"it's the most important page, so let's prove the migration works on it before wasting time on less important pages.\" What's wrong with that plan?",
      choices: [
        {
          id: 'a',
          text: "Nothing — proving the migration on the highest-stakes page first is the fastest way to find real problems.",
        },
        {
          id: 'b',
          text: "It inverts the strangler pattern: starting with the highest-risk, authenticated, mutation-heavy route means any migration bug (a broken loader, a session-handling gap) surfaces first on the page where it's most costly, instead of on a low-stakes public page where it's cheap to catch and roll back.",
        },
        { id: 'c', text: 'It doesn\'t matter which route migrates first, as long as the shared layout is extracted eventually.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "The whole point of migrating public, unauthenticated, read-only routes first is that mistakes there are cheap. By the time the data-loading pattern and shared layout have proven themselves on low-stakes pages, migrating the billing page is a repeat of a process that already worked, not a first attempt on the page that can least afford to break.",
    },
    {
      id: 'q4',
      prompt:
        "A team is choosing between TanStack Start and React Router 8 framework mode for a new product. Someone argues \"TanStack Start's route tree gives us stronger inferred typing, so it's strictly the better choice.\" What's missing from that argument?",
      choices: [
        {
          id: 'a',
          text: "Nothing — stronger type inference is the only axis that matters for a framework choice.",
        },
        {
          id: 'b',
          text: "Type safety is one axis among several — as of this lesson's writing, TanStack Start is still shipping pre-1.0 releases after reaching release-candidate status in September 2025, which is a maturity/stability-record tradeoff the argument never weighs against the typing win.",
        },
        { id: 'c', text: 'Type inference strength is identical between the two, so the premise itself is false.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "A real decision weighs every axis you care about, not just the one that happens to favor your preferred answer. Stronger typed routes is a genuine advantage, but pre-1.0 status is a genuine cost for a team betting a production launch on it — the decision procedure's scoring step exists precisely to make tradeoffs like this explicit instead of implicit.",
    },
    {
      id: 'q5',
      prompt:
        "A content-heavy marketing site with one interactive pricing calculator widget is being built by a team fluent in React. Someone suggests Astro with the calculator as a React island rather than a full Next.js or React Router app. What's the strongest justification for that choice?",
      choices: [
        {
          id: 'a',
          text: "Astro is objectively faster than every other framework in every scenario, so it should always be the default choice.",
        },
        {
          id: 'b',
          text: "Astro ships zero client JS by default and only hydrates explicitly marked islands, so a page that's almost entirely static content pays for exactly one component's worth of JS instead of a whole framework's client runtime — which matches this project's actual shape (mostly static, one interactive widget) better than a framework whose default is interactive-by-default.",
        },
        { id: 'c', text: 'Astro is required whenever a React component needs to run in the browser at all.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "The right choice matches the framework's default bet to the project's actual shape. Astro's bet — most of the page is static, interactivity is the exception — fits a content site with one widget. The same bet would fight against a project that's interactive on nearly every route, which is exactly why this isn't a universal recommendation.",
    },
    {
      id: 'q6',
      prompt:
        "A team wants to avoid ever repeating a full framework migration. Someone proposes writing all data-loading functions directly against Next.js's specific server context object from day one, since \"we've already committed to Next.js, so there's no cost to using its APIs directly.\" What's the flaw in that reasoning?",
      choices: [
        {
          id: 'a',
          text: 'There is no flaw — once a framework is chosen, writing directly against its specific APIs everywhere is always the right move.',
        },
        {
          id: 'b',
          text: "Writing directly against one framework's non-standard context object is exactly the choice that makes a *future* migration harder, even if today's migration is already decided; preferring standard Web APIs (Request/Response, fetch) where a choice exists costs little now and keeps a later strangler migration cheaper, which is the whole point of avoiding lock-in as a practice, not just a one-time evaluation step.",
        },
        { id: 'c', text: 'This only matters for teams using TanStack Start or React Router, not Next.js.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Avoiding lock-in isn't only about which framework you pick once — it's an ongoing habit in how you write the code inside whichever framework you chose. Standard Web APIs port across frameworks; a framework-specific context object doesn't, and that cost shows up the next time a migration (or even a major-version upgrade) is on the table.",
    },
  ],
};
