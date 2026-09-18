import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A team is building a documentation site and debating Docusaurus versus Astro Starlight. Both can render Markdown/MDX with a sidebar and search. What is the most accurate way to describe the practical difference in what ships to the browser?',
      choices: [
        {
          id: 'a',
          text: 'They are functionally identical; the choice is purely aesthetic.',
        },
        {
          id: 'b',
          text: "Starlight inherits Astro's islands model, so a docs page is static HTML with JavaScript only for the components that opt in, while Docusaurus's React-based pages hydrate more of the tree by default.",
        },
        { id: 'c', text: 'Docusaurus cannot render MDX, only plain Markdown.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Starlight's islands architecture means most of a docs page ships zero client JavaScript unless a component explicitly asks for hydration (client:load, client:visible, ...). Docusaurus is a full React app rendering the docs UI, so more of its tree is part of the client bundle by default even though the content is still static at request time.",
    },
    {
      id: 'q2',
      prompt:
        "A content collection's schema marks `publishedAt` as a required `date`. A Markdown file has `publishedAt: not-a-real-date` in its frontmatter. What should `buildCollection` do with that file?",
      choices: [
        {
          id: 'a',
          text: 'Include it as a valid entry, since the field is present and the build should not fail on bad data.',
        },
        {
          id: 'b',
          text: "Reject it: the field is present but the parsed value isn't a valid Date, so it fails the schema's type check and becomes an error, not an entry.",
        },
        { id: 'c', text: 'Silently coerce the value to today\'s date.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "A schema exists to catch exactly this: presence isn't enough, the value has to match the declared type. A string that fails to parse as a date is present but invalid, so it should be routed to errors, the same way Zod would throw at build time in Astro's real content layer.",
    },
    {
      id: 'q3',
      prompt:
        'A product catalog has 200,000 SKU pages, and inventory counts update every few minutes from a warehouse feed. A teammate proposes running a full static rebuild on every inventory update. What is the strongest argument against that plan?',
      choices: [
        {
          id: 'a',
          text: 'Static sites cannot show inventory counts at all, so the whole approach is wrong.',
        },
        {
          id: 'b',
          text: "A full rebuild's cost scales with total page count, not with what changed; at that page count and update frequency, the queue of full rebuilds will fall permanently behind, which is exactly the case for incremental builds, ISR, or edge SSR instead.",
        },
        { id: 'c', text: 'Full rebuilds are always faster than incremental ones, so this is a non-issue.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "SSG's core tradeoff is that a rebuild is the unit of freshness. When both the page count and the update frequency are high, a full rebuild's fixed per-run cost stops being affordable long before an incremental approach would. Incremental builds address 'only some pages changed'; ISR or edge SSR address 'a build can't keep up with the update rate at all.'",
    },
    {
      id: 'q4',
      prompt:
        "A team sets `output: 'export'` in their Next.js config so the whole app deploys to a static CDN. They then discover their `/dashboard` route, which uses Server Actions and reads cookies per request, no longer works. What's the underlying issue?",
      choices: [
        {
          id: 'a',
          text: 'A bug in Next.js unrelated to the export setting.',
        },
        {
          id: 'b',
          text: "Static export prerenders the entire app to HTML with no server; anything requiring a per-request server (Server Actions, middleware/proxy.ts, cookie-based personalization) has no runtime left to execute in, so it has to be removed or the app needs a different rendering strategy for that route.",
        },
        { id: 'c', text: 'output: \'export\' only affects images, nothing else.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "output: 'export' is an all-or-nothing switch for the whole app: it disables every feature that assumes a live Node/edge server, because there won't be one at request time. A mixed app — some static, some server-rendered — needs a framework that supports that split per-route, like React Router 8's prerender list, rather than Next's whole-app static export.",
    },
    {
      id: 'q5',
      prompt:
        "React Router 8's `prerender` config lets specific routes be rendered to static HTML at build time while other routes in the same app keep running loaders on a server. Why might a team pick this over a full static export or a full SSR app?",
      choices: [
        {
          id: 'a',
          text: "It doesn't offer any advantage; picking one strategy for the whole app is always simpler and equally fast.",
        },
        {
          id: 'b',
          text: 'It lets marketing/content routes get the cost and caching profile of pure static output while a dashboard or authenticated section keeps per-request data, without splitting the app into two separate projects or deploy pipelines.',
        },
        { id: 'c', text: 'prerender only works if every route in the app is also static.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "The value of a per-route prerender list is exactly that it's per-route: the pages that don't need personalization get the cheapest possible hosting story, and the ones that do keep their server loader, in one app and one deploy. That's the same instinct behind Astro's server islands, applied at the route level instead of the component level.",
    },
    {
      id: 'q6',
      prompt:
        "An incremental build system computes a dependency graph where a page depends on a template, and the template depends on a shared data file. A teammate says: \"we only need to track which pages directly reference a changed file, not walk the whole chain.\" What breaks with that shortcut?",
      choices: [
        {
          id: 'a',
          text: "Nothing breaks; direct references are always sufficient because templates rarely change.",
        },
        {
          id: 'b',
          text: "A page that never mentions the data file directly — only through the template it uses — would be missed entirely when that data file changes, serving stale content until some unrelated event happens to trigger a full rebuild.",
        },
        { id: 'c', text: 'The shortcut only fails for pages with no templates at all.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "This is exactly why dirtyPages has to compute each page's transitive closure rather than checking only its direct dependency list. A shared data file is often several hops away from the pages that ultimately render it through a template, and a non-transitive check would silently under-invalidate, leaving stale pages live.",
    },
  ],
};
