import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A marketing page has an excellent Lighthouse performance score in CI on every PR, but Search Console shows its LCP as "poor" for real users. Which explanation is most likely, given how each tool actually measures?',
      choices: [
        {
          id: 'a',
          text: 'Search Console must be using stale data; Lighthouse in CI is the more trustworthy, current signal.',
        },
        {
          id: 'b',
          text: 'Lighthouse is one simulated run under fixed lab conditions; Search Console reflects CrUX field data at the real p75 across actual visitors, including slower devices and networks CI never tests.',
        },
        { id: 'c', text: 'LCP cannot be measured in Lighthouse at all, so the two tools are reporting unrelated metrics.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Lighthouse lab runs use one simulated environment and can look great while the real traffic mix — slower phones, congested networks, cold caches — pushes the field p75 for the same page into "poor." Lab and field are expected to disagree; only field data is what CWV thresholds and Search Console actually score.',
    },
    {
      id: 'q2',
      prompt:
        'A page has exactly 40 recorded interactions this session, with latencies mostly around 90ms and one outlier at 1200ms from a slow third-party script. What is the reported INP for this session?',
      choices: [
        { id: 'a', text: '1200ms — INP is always the single worst interaction unless CrUX says otherwise.' },
        {
          id: 'b',
          text: '1200ms — with 40 interactions (50 or fewer), zero are discarded, so the worst one stands as the reported value.',
        },
        { id: 'c', text: '90ms — INP always reports the median interaction, not the worst.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The discard rule only kicks in past 50 interactions (one discarded per 50 recorded). With 40 interactions, nothing is discarded, so the reported INP is simply the worst one recorded: 1200ms.',
    },
    {
      id: 'q3',
      prompt:
        'A checkout page opens a "confirm your address" modal instantly after the user clicks Continue, shifting content down by 400px. A CLS report later flags a large unexpected layout shift at nearly the same timestamp from an unrelated late-loading ad slot. How should these two shifts be treated differently?',
      choices: [
        {
          id: 'a',
          text: 'Both count fully toward CLS, since any visible movement of that size is bad for the user regardless of cause.',
        },
        {
          id: 'b',
          text: 'The modal opening is excluded because it happened within 500ms of a genuine click (hadRecentInput), while the ad slot shift is not excluded and adds to the CLS session score.',
        },
        { id: 'c', text: 'Neither counts, because both happened during the same session window.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'CLS specifically excludes shifts flagged `hadRecentInput` — those within 500ms of a discrete click/tap/keypress — because they are an expected result of the user\'s own action. The ad slot shift has no such input to blame and is scored normally.',
    },
    {
      id: 'q4',
      prompt:
        'Your `web-vitals/attribution` build reports a bad LCP for a product page, with `elementRenderDelay` dominating the breakdown (much larger than `timeToFirstByte`, `resourceLoadDelay`, or `resourceLoadDuration`). What does that specific breakdown point to, versus the other three fields?',
      choices: [
        {
          id: 'a',
          text: 'The server is slow to respond to the initial navigation request.',
        },
        {
          id: 'b',
          text: 'The LCP resource (e.g. the hero image) itself is slow to download once discovered.',
        },
        {
          id: 'c',
          text: 'The resource downloaded fine, but something on the main thread — render-blocking JS, a long task — is delaying the browser from actually painting it once it is ready.',
        },
      ],
      correctChoiceId: 'c',
      explanation:
        'The four LCP attribution phases split time into: time to first byte (server), resource load delay (how late the resource started downloading after navigation), resource load duration (the download itself), and element render delay (ready-to-paint but blocked from painting, usually by main-thread work). A dominant render delay means the fix is on the main thread, not the network.',
    },
    {
      id: 'q5',
      prompt:
        'A team ships a single-page app where users load the shell once and then navigate between six views entirely client-side over a 15-minute session. Without any extra instrumentation, what happens to their CWV data, and why is Chrome\'s Soft Navigations API only a partial fix today?',
      choices: [
        {
          id: 'a',
          text: 'Nothing changes — LCP, INP, and CLS automatically re-measure on every client-side route change in every browser.',
        },
        {
          id: 'b',
          text: 'By default the tools see one long "page view" and can\'t attribute vitals to individual views; the Soft Navigations API can reset measurement per soft navigation in Chrome, but it is Chromium-only and CrUX/Search Console don\'t yet fold soft-nav vitals into the field data that\'s actually scored.',
        },
        { id: 'c', text: 'CLS becomes impossible to measure entirely once a page uses client-side routing.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'CWV was designed around one navigation producing one measurement window. An SPA that never reloads breaks that assumption unless something detects the soft navigation. Chrome can now do that natively, but the fix is Chromium-only and hasn\'t propagated into the CrUX-backed field data that Search Console and ranking actually use — so most teams still need to instrument route changes themselves for now.',
    },
    {
      id: 'q6',
      prompt:
        'You need to ship a metric the instant a page is torn down (e.g. the tab is closed or the user navigates away), and it must not be lost. Which approach is most reliable, and why?',
      choices: [
        {
          id: 'a',
          text: 'A `fetch()` call started inside a `beforeunload` handler, since `beforeunload` always fires reliably across browsers and devices.',
        },
        {
          id: 'b',
          text: '`navigator.sendBeacon()`, triggered on `visibilitychange` turning `hidden` (with `pagehide` as a fallback), since the beacon is queued by the browser and can be delivered even after the page has already unloaded.',
        },
        { id: 'c', text: 'A synchronous XHR request in an `unload` handler, since synchronous requests block navigation until they complete.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`sendBeacon` is designed for exactly this: it hands the request to the browser to deliver in the background, surviving the page\'s teardown. `visibilitychange` to `hidden` is the more reliable signal than `pagehide`/`beforeunload` on mobile, where backgrounded tabs are often killed without those events firing. Synchronous XHR on unload is a legacy anti-pattern that actively delays navigation.',
    },
  ],
};
