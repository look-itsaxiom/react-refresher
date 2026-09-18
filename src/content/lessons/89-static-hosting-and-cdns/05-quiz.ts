import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'static-hosting-and-cdns-quiz',
  title: 'Quiz: Static hosting and CDNs',
  questions: [
    {
      id: 'gh-pages-base',
      prompt:
        'A React app builds and deploys cleanly to GitHub Pages, but the live project site (`you.github.io/my-repo/`) loads a blank page with 404s for every JS and CSS file in the network tab. Local `pnpm dev` and `pnpm preview` both work fine. What is the most likely cause?',
      choices: [
        { id: 'a', text: 'GitHub Pages does not support single-page apps at all.' },
        {
          id: 'b',
          text:
            "Vite's `base` option (or the equivalent for the bundler in use) was never set to '/my-repo/', so the build emits asset URLs rooted at '/' instead of the actual subpath the project site is served under.",
        },
        { id: 'c', text: 'The repository needs to be public for assets to load.' },
        { id: 'd', text: 'GitHub Pages requires a custom domain before any JavaScript will execute.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "A GitHub Pages project site is served under '/repo-name/', not the domain root, so every absolute asset URL the build emits needs that prefix. `pnpm dev`/`pnpm preview` serve from the root and never surface this, which is exactly why it slips past local testing and only shows up once deployed.",
    },
    {
      id: 'purge-vs-atomic',
      prompt:
        "After reading about atomic deploys, a teammate says: \"since every deploy is atomic, we never need to think about CDN purges again.\" Is that right?",
      choices: [
        { id: 'a', text: "Yes, atomic deploys make purging obsolete in every case." },
        {
          id: 'b',
          text:
            "Mostly, but not entirely -- atomic deploys plus content-hashed filenames mean hashed assets never need a purge (a changed file gets a new URL), but an unhashed path cached longer than \"always revalidate\" (a non-hashed API response behind the same CDN, say) still needs an explicit purge when its content changes.",
        },
        { id: 'c', text: 'No -- atomic deploys have nothing to do with caching or purging at all.' },
        { id: 'd', text: 'Purging is only relevant for GitHub Pages, not Netlify, Vercel, or Cloudflare.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The hashed-filename trick is what does the heavy lifting here, not the atomic deploy by itself. Atomic deploys guarantee the new file tree is consistent; content hashing is what guarantees an old cached URL never gets reused for new content. The remaining purge case is specifically the unhashed, longer-than-revalidate path.',
    },
    {
      id: 'rewrite-vs-redirect',
      prompt:
        "A `_redirects` rule reads `/api/* https://api.example.com/:splat 200`. What does the `200` do here, and what does the browser's address bar show after a request to `/api/users`?",
      choices: [
        {
          id: 'a',
          text:
            "It's a rewrite (proxy), not a redirect: the host fetches https://api.example.com/users on the visitor's behalf and returns that response, and the address bar still shows /api/users.",
        },
        { id: 'b', text: "It's a permanent redirect; the address bar changes to https://api.example.com/users." },
        { id: 'c', text: '200 is invalid in a redirect rule and this line is silently ignored.' },
        { id: 'd', text: 'It sends a 200 response with an empty body and lets the browser retry the request itself.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "The 30x-vs-200 distinction is the core difference between a redirect and a rewrite. 30x tells the browser \"go elsewhere\" and the address bar updates. 200 means \"serve different content at this same URL\" -- the host does the fetch and the visitor never sees the target address, which is exactly how these platforms let a static frontend proxy an API without CORS complications.",
    },
    {
      id: 'spa-fallback-tradeoff',
      prompt:
        "A team switches their SPA's fallback from GitHub Pages' `404.html` hack to Netlify's `/* /index.html 200` rewrite, expecting a pure improvement. What's the real trade-off they're making?",
      choices: [
        { id: 'a', text: "There is no trade-off; the 200 rewrite is strictly better in every respect." },
        {
          id: 'b',
          text:
            'They fix the wrong-status-code problem (crawlers and uptime monitors no longer see a false 404 for real in-app routes) but lose the ability to distinguish a genuine typo/broken link from a real page -- every unmatched path now returns 200, so broken links stop surfacing as 404s in analytics.',
        },
        { id: 'c', text: 'The 200 rewrite breaks client-side routing entirely, so this would be a regression.' },
        { id: 'd', text: 'This only affects build time, not anything visible to users or crawlers.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Both fallback mechanisms are compromises for the same underlying problem: a client router needs *something* served for paths that don't correspond to a real file. GitHub Pages' hack keeps an honest 404 status at the cost of a jarring flash-of-404-then-render; the 200 rewrite fixes that but makes every URL look like a hit. SSG/SSR avoid the whole trade-off because every route is a real, individually resolvable response.",
    },
    {
      id: 'vite-env-secret',
      prompt:
        "A developer adds `VITE_STRIPE_SECRET_KEY=sk_live_...` to a Vite project's `.env` and reads it with `import.meta.env.VITE_STRIPE_SECRET_KEY` inside a component, reasoning \"it's an environment variable, so it's server-side config.\" What's actually true about that key once the app is built and deployed to a static host?",
      choices: [
        { id: 'a', text: "It stays server-side and is only readable by the build process, never shipped to the browser." },
        {
          id: 'b',
          text:
            "It's baked directly into the built JavaScript bundle as a plain string, and therefore fully visible to anyone who opens the browser's network tab or dev tools -- functionally identical to hardcoding the key in source.",
        },
        { id: 'c', text: 'It is encrypted automatically by Vite and only decryptable by the same origin.' },
        { id: 'd', text: 'It works fine as long as the repository itself stays private.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Any `VITE_*` variable is a build-time substitution into client-shipped code, full stop -- there's no server present at request time on a static host to keep it secret. A secret key belongs in a serverless function or edge runtime that reads it at request time from the platform's own environment, not in a client build.",
    },
    {
      id: 'preview-url-leak',
      prompt:
        'A design partner asks for a link to review a work-in-progress feature before it ships. Someone pastes the Netlify deploy-preview URL into a public Slack channel that has an external integration bot posting link previews. Two weeks later the unfinished feature shows up indexed in a search engine. Which platform default is responsible, and what would have prevented it?',
      choices: [
        { id: 'a', text: 'Netlify deploy previews are indexed and public by default with no way to change that.' },
        {
          id: 'b',
          text:
            "Preview deployments are typically reachable without auth and have no built-in noindex signal by default, so a link preview bot (or anyone who follows the link) can get it crawled; setting an X-Robots-Tag: noindex header on preview hosts and/or turning on the platform's deployment/visitor access protection would have prevented it.",
        },
        { id: 'c', text: 'The bug is Slack indexing content, unrelated to how the preview host itself is configured.' },
        { id: 'd', text: 'This can only happen with Netlify, not Vercel or Cloudflare Pages.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "This is the 'preview URL leak' hazard by name: preview hosts on every one of these platforms are, by default, real reachable URLs with no crawling opt-out and often no auth gate. The fix is proactive -- a noindex header rule scoped to preview hostnames, plus the platform's own access-protection setting for anything actually sensitive -- not something to notice only after it happens.",
    },
  ],
};
