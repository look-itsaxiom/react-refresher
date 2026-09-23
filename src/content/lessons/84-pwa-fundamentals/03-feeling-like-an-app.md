# Feeling like an app

A manifest gets you installed. It doesn't get you *believed*. The gap between "technically
a PWA" and "feels like the native thing next to it in the dock" is a checklist of small,
specific decisions — most of them CSS and a few DOM APIs, none of them a service worker.

## Detecting how you're being run

You cannot read `display` back out of the manifest at runtime — the browser doesn't expose
"which mode did you launch me in" as a manifest property. Instead you ask the environment
directly:

```ts
const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
// iOS Safari predates the media query; it still needs its own non-standard flag:
const isIOSStandalone = (navigator as { standalone?: boolean }).standalone === true;
```

`matchMedia('(display-mode: X)')` matches whichever mode the browser actually launched in —
`browser`, `standalone`, `minimal-ui`, `fullscreen`, or (Chromium desktop)
`window-controls-overlay`. Read it once on mount and again on a `change` listener, since a
user can, on some platforms, detach a PWA window into a plain tab or vice versa without a
full reload. This is the only reliable way to answer "is this already installed and
running as an app," which matters because you should never show an install prompt to
someone already inside the installed app.

## Capturing the install prompt

Chromium fires `beforeinstallprompt` on the `window` when it has decided your page is
eligible and the engagement heuristic has been met — you cannot force it earlier, and it
does not fire again if you don't call `preventDefault()` on it, because the default action
is Chromium's own generic install UI. The standard pattern:

```ts
let deferredPrompt: BeforeInstallPromptEvent | null = null;

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();       // suppress Chromium's built-in mini-infobar
  deferredPrompt = event as BeforeInstallPromptEvent;
  showYourOwnInstallButton();
});

async function onInstallButtonClick() {
  if (!deferredPrompt) return;
  await deferredPrompt.prompt();               // shows the real native dialog, now, on your terms
  const { outcome } = await deferredPrompt.userChoice; // 'accepted' | 'dismissed'
  deferredPrompt = null;                        // an event fires once; never reusable
  hideYourOwnInstallButton();
}

window.addEventListener('appinstalled', () => {
  // fires on successful install, regardless of which UI triggered it —
  // yours, the browser's own menu item, or the omnibox install icon
  hideYourOwnInstallButton();
});
```

The event is single-use: `prompt()` can only be called once per captured event, and a
second `beforeinstallprompt` won't fire until the browser decides to re-offer (typically
after the user dismisses and enough time or engagement passes again). `appinstalled` is
your source of truth for "it's installed now" — don't infer that from `outcome === 'accepted'`
alone, since the user still has to click through the native dialog after accepting your
button.

Two hard constraints shape everything above: **`beforeinstallprompt` is Chromium-only** —
Firefox and Safari never fire it — and it only tells you the browser is *willing*, not that
the user wants it *now*. Gate your own prompt behind a moment that means something (finished
a task, hit a natural pause), not "on page load," or you'll train users to dismiss it on
reflex. For everyone outside Chromium, and for anyone who dismissed your button, fall back to
a static "how to install" affordance: Safari's is "tap Share, then Add to Home Screen";
there's no programmatic trigger, only instructions. `navigator.getInstalledRelatedApps()`
(Chromium, and only for apps declared via `related_applications`) can tell you a *native*
counterpart is already installed, which is a different question from "is this PWA
installed" — useful for not double-prompting a user who already has your app from a store.

## The UX checklist, and the CSS that implements it

Each of these is a one- or two-line fix, and each is invisible until it's missing:

- **Safe areas.** `<meta name="viewport" content="viewport-fit=cover">` lets your content
  extend under notches and rounded corners; without the matching CSS you'll draw *behind*
  the OS's own UI. Pad with the env variables instead of hardcoded pixels:
  `padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);`
- **`theme-color`, conditionally.** `<meta name="theme-color" content="#0b1220" media="(prefers-color-scheme: dark)">`
  plus a second tag for light — the browser picks the matching one live, so the status bar
  and window chrome track the user's OS theme instead of freezing at whatever you shipped.
- **The 300ms tap delay is a myth to retire, not a fix to apply.** Mobile Safari and Chrome
  both removed the historical double-tap-to-zoom delay years ago on pages with a
  properly configured `viewport` meta tag; there's no lingering delay to fight in 2026.
  What you *do* still need is `touch-action: manipulation` (or `none`) on custom
  interactive elements — buttons, drag handles, custom sliders — so the browser skips its
  own gesture disambiguation (double-tap-zoom, pan) for that element specifically, which
  shaves real, measurable latency off a `pointerdown`-to-response chain even without the
  old delay bug.
- **`overscroll-behavior: contain`** on scrollable panels (a chat pane, a modal's body)
  stops scroll momentum from "chaining" into the page behind it — the rubber-band bounce
  or pull-to-refresh that fires on the wrong element and makes a nested scroll area feel
  broken.
- **`user-select: none`** on chrome you don't want text-selected by an accidental long-press
  — icon buttons, drag handles, nav labels — paired with leaving it *unset* (selectable) on
  actual content. Over-applying this is the single most common way a "polished" PWA
  frustrates someone trying to copy real text.
- **Back-navigation expectations.** In `standalone` mode there's no browser back button.
  Android supplies a system back gesture/button that, absent any handling, closes your
  entire app from one level of in-app navigation. Handle it with the History API
  (`pushState` per view, a `popstate` listener that navigates your own router instead of
  exiting) so back behaves like a screen stack, not an app-closer.
- **An offline fallback users can act on.** This lesson doesn't build the service worker
  that makes offline actually work — that's lesson 85 — but the UX contract is decided
  here: what does the user see when a fetch fails offline? A blank white screen is a
  failure state; a "you're offline — showing your last synced data" banner over stale
  content is a design decision you make before there's a service worker to wire it to.

## Shortcuts, window controls overlay, and the death of the Lighthouse badge

`shortcuts` in the manifest (shown in the concept 1 example) adds entries to the icon's
right-click/long-press context menu — "New board," "Search," whatever your two or three
most common entry points are — each with its own `url` and optional icon. It costs one array
in the manifest and nothing in code beyond routes that already exist.

`window-controls-overlay` (via `display_override`, concept 1) lets a desktop PWA draw into
the titlebar strip instead of leaving it blank OS chrome — check availability with
`navigator.windowControlsOverlay?.visible` and lay out around
`navigator.windowControlsOverlay.getTitlebarAreaRect()` so your content doesn't sit under
the (still OS-drawn) minimize/maximize/close buttons.

Lighthouse **removed its dedicated PWA audit category** in Chrome DevTools; the old
installability checklist and score are gone. There is no successor badge to chase. What
replaced it: `chrome://web-app-internals` for a live, real-data view of installability
state and manifest parsing; [PWABuilder](https://www.pwabuilder.com/) for an external
audit-plus-packaging tool; and the informal industry default of just testing the checklist
in this lesson by hand — install it, kill the network, background it, rotate the device —
because no single score ever captured "does this feel like an app" well enough to trust
blindly.

## Getting into stores without writing a store app

[PWABuilder](https://www.pwabuilder.com/) takes your manifest and packages the same PWA for
distribution: a signed package for the **Microsoft Store** (native support, least friction),
an Android package via **Trusted Web Activity** (a full-screen Chrome tab wrapped in a thin
native shell) for **Google Play**, generated by the same underlying tooling as **Bubblewrap**
if you want the CLI directly. **iOS/App Store packaging is the one PWABuilder does not offer**
— Apple's store policy and WebKit's PWA support are the long-running constraint here; the
only iOS path remains the manual Safari "Add to Home Screen" flow from concept 1, not a
store listing. Treat any specific claim about iOS store distribution changing as unverified
without checking Apple's current developer documentation directly.

## Further reading (optional)

- [web.dev — Patterns for promoting installation](https://web.dev/learn/pwa/installation-prompt)
- [MDN — `beforeinstallprompt` event](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event)
- [MDN — `env()` and safe area insets](https://developer.mozilla.org/en-US/docs/Web/CSS/env)
- [PWABuilder](https://www.pwabuilder.com/)
