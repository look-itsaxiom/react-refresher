# Deciding, migrating, and hedging

Knowing the axes doesn't decide anything by itself. You need a procedure
that turns "here's a project" into "here's a shortlist" into "here's the
one we're building on," plus a plan for the case that's most common in
practice: you already have an app, and the question isn't greenfield
choice but migration.

## A decision procedure

**1. Requirements, written down, before anyone names a framework.** What
does this product need — SEO-critical marketing pages, an authenticated
dashboard, a content site with occasional interactivity, a real-time
collaborative tool? What does the team already know? What's the deploy
target the org has already committed to (a specific cloud, an on-prem
requirement, a platform team that only supports containers)? Writing this
down first, separately from any framework's marketing page, is the single
biggest thing that prevents "we picked X because a blog post said to."

**2. Hard constraints.** Some requirements aren't tradeable. "Must not lock
us into one hosting vendor" eliminates relying on Next.js's
Vercel-optimized feature set unless you're comfortable with OpenNext as an
unofficial adapter layer. "Team has zero non-React experience and no
budget to gain any before launch" eliminates SvelteKit and Nuxt outright,
regardless of how good their satisfaction numbers are. "Ships to a specific
edge runtime with no Node APIs available" eliminates anything that hasn't
been verified to run there. List these before you look at satisfaction
surveys — a framework everyone loves is still wrong if it fails a hard
constraint.

**3. Shortlist from the axes.** With requirements and hard constraints
fixed, most projects narrow to two or three real candidates. This is
exactly the shape of exercise A in this lesson: score what's left against
weighted criteria, and let the hard constraints eliminate what can't
qualify no matter how well it scores.

**4. Spike, don't guess.** Pick the top one or two candidates and build the
actual hard part of your app in each — not a todo list, the specific thing
you're unsure about: the auth flow, the data-heavy dashboard, the route
that needs partial static/partial dynamic rendering. Measure build time on
a realistic page count, TTFB and LCP on the actual hosting target you'd
use in production, and how many "how do I even do X" moments the team hits
per day. A week of two real spikes beats a month of reading comparison
blog posts, including this lesson.

## Team size and product stage

A two-person startup pre-product-market-fit should weight learning curve
and deploy simplicity far above ecosystem completeness — you need to ship
and iterate, not future-proof against problems you don't have yet. A team
of thirty across a platform group and several product squads should weight
type safety and stability record higher, because the cost of an ambiguous
data-loading convention compounds across every team touching the codebase,
and a framework's breaking-change cadence becomes a scheduled tax rather
than a one-time event. Neither is "more correct" — they're optimizing for
different failure modes at different points in the product's life.

## Migrating from a Vite SPA

This is the situation this course's own app is in: a CSR Vite SPA using
React Router in library mode (`<BrowserRouter>`, routes composed in code,
no server rendering). Two realistic migration targets:

**React Router library mode → framework mode.** This is the shortest
migration of any option here, because you keep React Router: you add a
`react-router.config.ts`, convert route components into route modules with
`loader`/`action` exports, and let the framework's Vite plugin take over
routing and code-splitting. Data that used to live behind a `useEffect` and
a loading spinner moves into a `loader`; nothing about your component tree
or state management needs to change on day one. This is why it's usually
the right first migration target for a React SPA with no other constraints
pushing toward Next.js or TanStack Start specifically.

**Astro islands for a docs/marketing surface.** If part of the app is
content — a docs site, a marketing shell, a blog — and it's currently
shipping as client-rendered React inside the same SPA, splitting it into a
separate Astro deployment (or an Astro build that mounts your existing
React components as islands) removes JS from every page that doesn't need
interactivity, without touching the actual app.

## The strangler pattern

Don't do a big-bang rewrite. Migrate by route, starting with the routes
that are lowest-risk if something goes wrong: public, unauthenticated,
read-only pages first. If they render correctly under the new framework
and old and new can run side by side (behind a proxy or router that decides
per-path which app serves a request), you've derisked the migration before
touching anything a logged-in user depends on. Authenticated,
mutation-heavy routes migrate last, after the shared layout and the
data-loading pattern have already proven themselves on lower-stakes pages.
Exercise B in this lesson encodes exactly this ordering as a checkable
function.

## Avoiding lock-in as you migrate

Prefer adapters and standard Web APIs over framework-specific runtime
assumptions where you have the choice: a data-loading function that reads
from `Request`/`Response` and standard `fetch` ports across frameworks far
more easily than one written directly against a single framework's
non-standard context object. If you do choose Next.js, know that OpenNext
exists specifically so "built for Vercel" doesn't mean "can only run on
Vercel" — but budget time for it; it's a real adapter layer, not a
checkbox. If vendor neutrality is a hard constraint from step 2, it already
ruled out relying on it, but it's worth knowing the option exists for
everyone else.

## When to stay a SPA

Sometimes the answer is: don't migrate. A CSR SPA behind auth, with no SEO
requirement (nothing here needs to be crawled or shared with a link
preview), and a team that already ships fast on the current stack, gains
little from any of this lesson's frameworks — you'd be taking on a build
pipeline change, a new data-loading convention, and a deploy migration to
solve a problem you don't have. The rendering-strategy decision table from
lesson 44 already covers this per route; this lesson's addition is that
"stay CSR, ship as a plain Vite SPA" is itself a valid answer to "which
framework," not a failure to pick one.

## Further reading

- [React Router: Picking a Mode](https://reactrouter.com/start/modes)
- [OpenNext](https://opennext.js.org/)
- [TanStack: We Stopped Using RSC on TanStack.com](https://tanstack.com/blog/we-stopped-using-rsc-on-tanstack-com)
- [Astro: Islands architecture](https://docs.astro.build/en/concepts/islands/)
