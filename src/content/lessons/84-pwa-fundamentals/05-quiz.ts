import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A team ships a manifest, icons, and a service worker that only handles push notifications — it never intercepts `fetch` or caches anything, so the app is unusable offline. On current Chrome, does that block the install prompt from appearing?',
      choices: [
        { id: 'a', text: 'Yes — Chrome still requires the page to work offline before it will consider the app installable.' },
        {
          id: 'b',
          text: "No — Chrome dropped the offline-support requirement from its installability criteria in 2023. A valid manifest (name, icons, start_url in scope, a valid display mode) plus the engagement heuristic is enough; a service worker isn't required for the prompt at all.",
        },
        { id: 'c', text: 'No, but only because a service worker exists at all — any service worker, regardless of what it does, satisfies the old offline rule.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Chrome's installability bar no longer includes an offline-capability check; that requirement was removed in 2023. Installability today is decided from the manifest and engagement alone. Offline support is still worth building for the user experience — that's the next lesson's service worker — but it is not what gates the install prompt.",
    },
    {
      id: 'q2',
      prompt:
        'A marketing team wants every install triggered from a paid campaign to load `/?utm_source=ad123` as the initial `start_url`, with a different value per campaign. Without any other change, what risk does this introduce, and which manifest field addresses it?',
      choices: [
        {
          id: 'a',
          text: "None — browsers identify an installed PWA by its manifest's icon hash, so start_url can vary freely.",
        },
        {
          id: 'b',
          text: 'The `scope` field, widened to cover every campaign URL, is what keeps the app from being reinstalled per campaign.',
        },
        {
          id: 'c',
          text: "Without a stable `id`, changing `start_url` between installs risks the browser treating each campaign's install as a separate app, creating duplicate icons instead of one recognized install. Set a fixed `id` once and let `start_url` vary freely.",
        },
      ],
      correctChoiceId: 'c',
      explanation:
        "Before the `id` member existed, browsers used `start_url` as the app's identity, so changing it could look like a new app to install rather than an update to the existing one. `id` decouples identity from `start_url`: pick a stable value once, and `start_url` (and its query params) can change per campaign without spawning duplicate installs.",
    },
    {
      id: 'q3',
      prompt:
        "A team builds their entire install experience around capturing `beforeinstallprompt` and calling `.prompt()` from a custom button. QA reports the button never appears on Firefox desktop or Safari on iPad, even though the manifest passes validation. What's the right response?",
      choices: [
        { id: 'a', text: 'This is a bug in their manifest; fix the manifest and the event will fire everywhere.' },
        {
          id: 'b',
          text: "This is expected: `beforeinstallprompt` is a Chromium-only event. Firefox desktop has no install-prompt UI at all, and Safari never fires it — install there is always the user's own manual 'Add to Home Screen' action. The team needs a separate, always-visible fallback affordance for non-Chromium browsers, not a fix to the event capture.",
        },
        { id: 'c', text: "Safari and Firefox require the manifest's `related_applications` field to be set before they'll fire the equivalent event." },
      ],
      correctChoiceId: 'b',
      explanation:
        "`beforeinstallprompt` and the programmatic install flow it enables are Chromium-specific. Any install UX that only works through that event silently fails on every other engine. The fix is a persistent, manual 'how to install' affordance (Safari's Share-sheet instructions, for example) alongside — not instead of — the Chromium-specific button.",
    },
    {
      id: 'q4',
      prompt:
        "A designer delivers a maskable icon where the logo's outer edge touches all four corners of the 512x512 canvas, filling it completely. What will most platforms that apply the maskable mask do to this icon, and why?",
      choices: [
        {
          id: 'a',
          text: 'Nothing — `purpose: "maskable"` only affects the icon shown in the install dialog, never the home-screen icon.',
        },
        {
          id: 'b',
          text: "They'll crop it, likely clipping the logo's corners or edges: maskable icons are cropped to an OS-chosen shape (circle, squircle, rounded square), and only content inside the centered 80%-diameter safe-zone circle is guaranteed to survive. Content that reaches the canvas edge sits outside that safe zone.",
        },
        { id: 'c', text: 'The browser will reject the icon entirely and fall back to a generic default icon.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "The maskable safe zone is the centered circle covering 80% of the icon's diameter; anything outside it can be clipped by whichever mask shape the OS applies. A logo drawn edge-to-edge with no margin will lose its corners on most adaptive-icon shapes. The fix is a full-bleed background color with the logo confined to the safe-zone circle.",
    },
    {
      id: 'q5',
      prompt:
        "A team's install-readiness checklist still says 'ship until Lighthouse's PWA score hits 100.' A new hire points out Chrome DevTools no longer has a PWA category in Lighthouse at all. What should the checklist say instead?",
      choices: [
        {
          id: 'a',
          text: "There's no way to verify installability anymore; skip verification and ship on faith that the manifest is correct.",
        },
        {
          id: 'b',
          text: "Use `chrome://web-app-internals` for a live, real-data view of installability and manifest parsing, an external tool like PWABuilder for a fuller audit, and a manual pass through the install/offline/UX checklist by hand — there's no replacement score, only replacement tools plus judgment.",
        },
        { id: 'c', text: 'Switch entirely to running the Play Store TWA validator, since that is now the canonical installability check for all platforms.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Lighthouse dropped its dedicated PWA audit category and score; no single number replaced it. `chrome://web-app-internals` gives real installability/manifest-parsing state, PWABuilder gives an external audit plus packaging, and the rest is the manual checklist — installing, killing the network, backgrounding, rotating — because a single score never fully captured 'does this feel like an app.'",
    },
    {
      id: 'q6',
      prompt:
        'A PWA runs in standalone mode on Android. From the home view, a user opens a detail screen, then presses the system back button. Instead of returning to the home view, the entire app closes. What causes this, and what fixes it?',
      choices: [
        {
          id: 'a',
          text: "This is unavoidable in standalone mode; Android's back button always exits a PWA regardless of in-app navigation state.",
        },
        {
          id: 'b',
          text: 'Standalone mode has no browser chrome, and so no browser back button — the History API is still there, but if the app never pushed a history entry for the detail screen, there is nothing for the system back gesture to step back to, so it exits. Push a history entry per view (`pushState`) and handle `popstate` in-app to navigate back instead of exiting.',
        },
        { id: 'c', text: 'The fix requires a service worker to intercept the back gesture before the OS sees it.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Standalone mode removes browser UI, not the History API. Android's system back gesture still walks the page's own history stack; if in-app navigation never calls `pushState`, there's only one entry, and back has nowhere to go but out of the app. Treating each view as a history entry and handling `popstate` makes back behave like a screen stack instead of an app-closer.",
    },
  ],
};
