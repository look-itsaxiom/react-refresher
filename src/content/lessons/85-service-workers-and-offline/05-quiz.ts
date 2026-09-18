import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'service-workers-and-offline-quiz',
  title: 'Quiz: Service workers and offline',
  questions: [
    {
      id: 'auto-update-hazard',
      prompt:
        "A team ships `vite-plugin-pwa` with `registerType: 'autoUpdate'` on an app with a multi-step wizard that keeps state in memory across several client-side routes. Users occasionally report the wizard 'glitching' mid-flow with no console error. What's the most likely cause, and is it a service worker bug?",
      choices: [
        { id: 'a', text: 'It is unrelated to the service worker; autoUpdate only affects the offline page.' },
        {
          id: 'b',
          text:
            "It's the mid-session double-version hazard: autoUpdate calls skipWaiting()/clients.claim() as soon as a new deploy ships, so a tab left open through a deploy can suddenly have its fetch calls intercepted by a new worker's logic while the page's own JS is still the old version -- no error is thrown, behavior just quietly diverges.",
        },
        { id: 'c', text: 'The service worker is caching the wizard state itself and serving it stale.' },
        { id: 'd', text: 'This can only happen with registerType: \'prompt\', never with autoUpdate.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "autoUpdate trades the reload prompt for silent, immediate takeover. That's fine for stateless pages; for anything holding meaningful client state across a session, the safer default is 'prompt' so the update only happens at a moment the user (and the app) can handle -- a full reload.",
    },
    {
      id: 'sw-js-cache-control',
      prompt:
        'A deploy pipeline sets `Cache-Control: public, max-age=31536000, immutable` on every file under `/dist/`, including `sw.js`, because "long caching is good for performance." Six weeks and three deploys later, a critical bug fix isn\'t reaching any returning visitor. Why?',
      choices: [
        { id: 'a', text: 'Service workers ignore Cache-Control entirely, so this setting has no effect either way.' },
        {
          id: 'b',
          text:
            "The browser's own service-worker update check already ignores Cache-Control (up to a 24h ceiling) when re-fetching sw.js -- but a CDN or intermediate cache in front of the origin does honor it, so the CDN keeps serving last year's sw.js bytes and the browser's update check never sees a diff.",
        },
        { id: 'c', text: 'This only affects first-time visitors, not returning ones.' },
        { id: 'd', text: 'immutable disables service worker registration entirely.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "The browser-level exemption from Cache-Control only covers the browser's own fetch of the script. Any cache sitting between the browser and your origin -- a CDN, a reverse proxy -- still honors ordinary HTTP caching headers on that same request, and can defeat the update mechanism entirely. sw.js needs Cache-Control: no-cache (or max-age=0) set explicitly, everywhere in the chain.",
    },
    {
      id: 'strategy-for-api-get',
      prompt:
        'A dashboard polls `GET /api/summary` every time the route mounts. The data is expensive to compute but tolerable to show slightly stale for a few seconds while a fresher copy loads. Which caching strategy fits, and why not cache-first or network-first instead?',
      choices: [
        {
          id: 'a',
          text:
            'Stale-while-revalidate: it returns the last cached response immediately (fast, no spinner) and refreshes the cache in the background, converging to fresh data on the next mount without ever blocking this one.',
        },
        { id: 'b', text: 'Cache-first, because the data rarely needs to be fresh at all.' },
        { id: 'c', text: 'Network-first, because staleness is never acceptable for API data.' },
        { id: 'd', text: 'Network-only, since caching GET requests is unsafe by definition.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "Cache-first would never refresh once cached (fine for hashed assets, wrong for data that changes). Network-first would reintroduce the latency this data doesn't need to pay every time. SWR is the strategy built specifically for 'slightly stale is fine, but keep converging' -- the same trade-off HTTP's own stale-while-revalidate directive names, just implemented as code you control.",
    },
    {
      id: 'background-sync-availability',
      prompt:
        "A team builds an offline-first note-taking app and relies on workbox-background-sync to queue and replay failed POSTs whenever the network returns, with no fallback path. What breaks, and where?",
      choices: [
        { id: 'a', text: 'Nothing -- Background Sync is a W3C standard supported identically everywhere.' },
        {
          id: 'b',
          text:
            "Background Sync (and Periodic Background Sync) is Chromium-only as of 2026 -- Safari and Firefox never fire the sync event, so a queued POST on those browsers simply never replays unless the app also handles the retry itself, e.g. on next page load or a manual retry action.",
        },
        { id: 'c', text: 'It works everywhere but requires the user to grant a special permission first.' },
        { id: 'd', text: 'It only fails on mobile Chrome, not desktop Chrome.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Treat Background Sync as a Chromium enhancement layered on top of a working fallback, never as the only retry mechanism -- an app that depends on it exclusively silently loses data entered offline in Safari and Firefox, with no error surfaced anywhere.",
    },
    {
      id: 'waiting-worker-purpose',
      prompt:
        "A developer, confused by the 'waiting' state, calls skipWaiting() unconditionally at the top of every install handler, reasoning 'the newest code should always run immediately.' What is the 'waiting' state actually protecting against, and what did removing it just give up?",
      choices: [
        { id: 'a', text: "Nothing real -- 'waiting' exists only to slow down rollouts and is safe to always skip." },
        {
          id: 'b',
          text:
            "It protects against two different SW versions being active in the same page's lifetime -- once every open tab controlled by the old worker has closed (a proxy for 'no in-memory state depends on old-version assumptions'), the new one can safely take over. Skipping it unconditionally reintroduces the risk of a tab's fetches switching handler logic mid-session.",
        },
        { id: 'c', text: "It exists only to work around a Safari-specific bug and has no effect in Chrome." },
        { id: 'd', text: 'It waits for the user to explicitly grant a permissions prompt before activating.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "The waiting state is the platform's default safety margin: don't hand a tab a new set of fetch-handling rules while it's mid-session with an old one, unless something (a user action, or a deliberate autoUpdate trade-off) says that's acceptable. Removing it isn't free -- it's trading correctness-by-default for always-latest, and that trade should be a decision, not a default nobody chose.",
    },
    {
      id: 'when-not-to-ship-sw',
      prompt:
        'A team building an internal admin dashboard, used only on a corporate network with no offline requirement, debates adding a service worker "since PWAs are best practice." What is the strongest argument against it here?',
      choices: [
        { id: 'a', text: 'Service workers are deprecated in 2026 in favor of a newer API.' },
        {
          id: 'b',
          text:
            "A service worker adds real complexity and failure modes (stale caches, update-flow bugs, the exact debugging overhead covered in this lesson) in exchange for a benefit -- offline resilience, repeat-visit speed -- that an always-online internal tool with no meaningful offline use case doesn't need.",
        },
        { id: 'c', text: 'Service workers can only be registered on HTTPS, and this app can\'t use HTTPS internally.' },
        { id: 'd', text: 'Admin dashboards are not allowed to use service workers by the App Manifest spec.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "'Best practice' is a starting heuristic, not a mandate -- every strategy in this lesson exists to solve a specific problem (staleness, offline gaps, slow repeat loads). If the problem doesn't exist for this app, the service worker is pure downside: another place for a stale-cache bug to hide, for no offline win anyone will use.",
    },
  ],
};
