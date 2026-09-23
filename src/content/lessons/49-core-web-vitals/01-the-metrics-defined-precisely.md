# The metrics, defined precisely

The rendering pipeline from the last lesson explains *how* pixels get to the screen.
Core Web Vitals (CWV) are the metrics Google standardized to answer a narrower question:
was this particular page load actually good for the person looking at it? As of
September 2026 the set is three metrics — **LCP**, **INP**, and **CLS** — after **FID**
(First Input Delay) was retired in March 2024 in favor of INP, which measures
responsiveness across the whole session instead of just the first interaction.

## LCP: did the main content show up fast?

**Largest Contentful Paint** is the render time of the largest image or text block
visible in the viewport when the page loads — usually a hero image, a heading, or a
above-the-fold block of text. It exists because "the page started responding" (which is
what old metrics like First Contentful Paint captured) doesn't mean the thing the user
came for has rendered; a spinner or a nav bar can paint first while the actual content is
still loading.

- **Good:** ≤ 2.5s. **Poor:** > 4.0s. Anything between is "needs improvement."
- The browser tracks LCP **candidates** as the page renders: each time a new element
  paints that is larger than the current largest, it becomes the new candidate. This is
  why LCP can "come from" an image that loads late — a hero image that finishes decoding
  at 3.1s replaces a heading that painted at 0.8s, because it covers more pixels.
- LCP **stops updating the moment the user interacts** with the page (a tap, a keypress
  that isn't part of scrolling, or a scroll). Whatever the largest candidate was at that
  point is final. This matters for long-lived pages: if nothing renders for the first ten
  minutes because it's a dashboard the user only scrolls after loading, LCP measures
  correctly; if the user interacts within the first second, LCP locks in early even if a
  bigger element would have painted a moment later.
- Cross-origin images without a `Timing-Allow-Origin` response header report `renderTime`
  as 0 for privacy reasons, falling back to `loadTime` — which is why LCP can occasionally
  look like it happened *before* First Contentful Paint in raw data pulled from resources
  that don't set that header. Chrome 133 tightened this so the two numbers stay
  consistent, but the header is still worth setting if you serve LCP candidates
  cross-origin (a CDN-hosted hero image, for instance).

## INP: did interactions feel instant?

**Interaction to Next Paint** replaced FID because FID only measured the *delay before*
an event handler started running for the very first interaction, which said nothing about
handlers that are slow to finish, or about the tenth click on a page instead of the
first. INP measures the full latency of an interaction — input delay, event handler
processing, and the time until the browser can paint the result — for essentially every
click, tap, and key press on the page, then reports a single number for the whole visit.

- **Good:** ≤ 200ms. **Poor:** > 500ms.
- Only discrete interactions count: clicking, tapping, and pressing a key. Hover,
  scrolling, and pinch-zoom are excluded — they're continuous, not discrete events, and
  the spec doesn't attempt to score them.
- INP isn't the *worst* interaction on a long-lived page — that would unfairly punish
  pages people spend a lot of time on, where more interactions means more chances to hit
  a rare hiccup. Instead the browser discards the single worst interaction for every 50
  interactions recorded, then reports the worst *remaining* one. With 50 or fewer
  interactions that's just the max. With 51–100 interactions, it discards the single
  worst and reports the second-worst. This is sometimes described loosely as "the ~98th
  percentile," but the actual rule is the discard-one-per-50 formula above — implement it
  that way, not by literally computing a percentile.

## CLS: did the layout jump around?

**Cumulative Layout Shift** scores unexpected movement of visible elements — a layout
shift's score is its impact fraction (how much of the viewport it affected) times its
distance fraction (how far it moved), and shifts triggered within 500ms of a genuine
tap/click/keypress are flagged `hadRecentInput` and excluded, since a menu that expands
because the user clicked "expand" is not an unexpected shift.

- **Good:** ≤ 0.1. **Poor:** > 0.25.
- Rather than summing every shift across the entire page lifetime (which would punish a
  page simply for staying open a long time, and reward one that reloads often), CLS groups
  shifts into **session windows**: a new window starts whenever the gap since the last
  shift exceeds 1 second, or the current window's total duration would exceed 5 seconds.
  Within a window, shift scores add up. The final CLS is the score of the single worst
  window, not the sum of all windows.

## The p75 rule, and why lab and field disagree

Every CWV threshold is applied to the **75th percentile** of real visits to a URL (or
origin) over a rolling window — a page "passes" LCP only if 75% of its real-world loads
were ≤ 2.5s. This is deliberate: it tolerates the slow 25% (throttled connections, old
phones, background tabs) without pretending the median hides a systemic problem for a
meaningful chunk of visitors. It's also why a single Lighthouse run and a site's real CWV
status routinely disagree — Lighthouse is a **lab** measurement (one simulated run, fixed
network/CPU throttling, no real users) reporting a **performance score** blended from
several metrics with weights, while CWV field data is aggregated real-user p75s from the
**Chrome UX Report** (CrUX). A page can lab-test perfectly on a fast machine on fiber and
still fail its field LCP because most of its actual traffic is mid-tier Android phones on
congested mobile networks — lab data can't see that distribution at all.

## SPAs: the long-lived-page problem

All three metrics were designed around the assumption of a traditional page load: one
navigation, one LCP, one CLS session, one INP tally. A single-page app that never does a
full navigation again after the first load breaks that assumption — by default, a CWV
tool sees exactly one "page view" for a session that might last twenty minutes and cover
six different views, and it can't tell that a client-side route change was a meaningful
new "page." The **Soft Navigations API**, stable in Chrome starting with version 151
(August 2026), lets the browser detect a URL change plus a DOM update following a user
interaction and treat it as a fresh navigation, resetting and re-measuring LCP/INP/CLS
for that soft-navigated view. It's still Chromium-only, and as of this writing CrUX,
PageSpeed Insights, and Search Console have not yet folded soft-navigation vitals into the
field data that feeds rankings — treat any soft-nav numbers you collect today as
directional for your own RUM, not as what Google is scoring you on. Until that lands
broadly, the practical move for an SPA is to instrument route changes yourself (the next
concept covers how) rather than wait for the platform to do it.

## Further reading (optional)

- [web.dev — Largest Contentful Paint (LCP)](https://web.dev/articles/lcp)
- [web.dev — Interaction to Next Paint (INP)](https://web.dev/articles/inp)
- [web.dev — Cumulative Layout Shift (CLS)](https://web.dev/articles/cls)
- [Chrome for Developers — Measuring soft navigations](https://developer.chrome.com/docs/web-platform/soft-navigations)
