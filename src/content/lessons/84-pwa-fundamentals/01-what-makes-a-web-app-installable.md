# What makes a web app installable

You've shipped React apps for years without ever writing a `manifest.webmanifest`. That was
fine when "install" meant a native app store. In September 2026 it's a gap: Chrome, Edge,
and Safari will all install a well-formed web app to the home screen or app list, no store
review required, and the difference between "just a website" and "installable app" is a
JSON file plus a few `<head>` tags. This lesson is that file, field by field, and the
per-browser rules that decide whether the install prompt shows up at all.

## The manifest is a contract, not decoration

A [web app manifest](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest)
is a JSON file, linked with `<link rel="manifest" href="/manifest.webmanifest">`, that tells
the browser what your app is called, where it starts, and how it should look once it's out
of the tab. Every field is a decision, not a formality:

```json
{
  "name": "Kanbanly",
  "short_name": "Kanbanly",
  "id": "/?homescreen=1",
  "start_url": "/?source=pwa",
  "scope": "/",
  "display": "standalone",
  "display_override": ["window-controls-overlay", "standalone"],
  "background_color": "#0b1220",
  "theme_color": "#0b1220",
  "orientation": "any",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "screenshots": [
    { "src": "/screens/wide.png", "sizes": "1280x800", "type": "image/png", "form_factor": "wide" },
    { "src": "/screens/narrow.png", "sizes": "750x1334", "type": "image/png", "form_factor": "narrow" }
  ],
  "shortcuts": [
    { "name": "New board", "url": "/boards/new", "icons": [{ "src": "/icons/new.png", "sizes": "96x96" }] }
  ]
}
```

**`name` vs `short_name`.** `name` is the full name shown in the install dialog and splash
screen; `short_name` is what gets crammed under the icon on a home screen. If your app is
called "Kanbanly Project Tracker," ship both — `short_name` alone is not a substitute for
`name` in Chromium's installability check.

**`start_url` and `scope`.** `start_url` is where the app opens from a cold launch (icon tap,
not a normal browser navigation); it must resolve to a URL inside `scope`, the URL prefix the
browser treats as "belonging to" this app. Any navigation the user makes that stays under
`scope` is still "in the app"; a link that leaves `scope` pops back into a regular browser
tab or view, even in standalone mode. A `start_url` outside `scope` is a hard installability
failure, not a warning — the two fields have to agree.

**`id`.** Added to the spec in 2023, `id` is the field almost every existing manifest is
missing, and it's the one that matters most for updates. Before `id` existed, browsers used
`start_url` to decide "is this the same app I already installed, or a new one?" That breaks
the moment you need to change `start_url` — add a query param for attribution, move to a new
marketing landing page — because now the browser sees a different identity and can install a
second, duplicate icon instead of updating the existing one. `id` decouples identity from
`start_url`: set it once, keep it stable forever (`"id": "/?homescreen=1"` is a common
convention — an unusual value that will never collide with a real navigation), and
`start_url` is now free to change without spawning duplicate installs.

**`display` and the `display_override` fallback chain.** `display` is the classic field with
four values: `browser` (a normal tab, not installed-feeling), `minimal-ui` (a small nav
affordance, mostly ignored by Chromium), `standalone` (no browser UI at all — the default
target for most PWAs), and `fullscreen` (standalone plus no OS chrome, used by games).
`display_override` is a newer, ordered list of the *same* values plus two Chromium-only ones —
`window-controls-overlay` (desktop: your app draws into the titlebar strip) and `tabbed`
(desktop: multiple app windows sharing one titlebar with tabs) — that lets you ask for a
richer mode with an explicit fallback. The browser walks `display_override` in order and
uses the first mode it supports; if none apply, or `display_override` is absent, it falls
back to `display`. `resolveDisplayMode` in the next exercise implements exactly that walk.

**Maskable icons.** Android's adaptive icon system, and increasingly others, crop your icon
into a shape you don't control — circle, squircle, rounded square, depending on the OS theme.
An icon with `"purpose": "maskable"` opts into that cropping and must keep everything
meaningful inside the **safe zone**: an 80%-diameter circle centered in the image. Anything
outside that circle can be clipped. Ship a maskable icon with full-bleed background color and
your logo confined to the safe zone, alongside a normal (`purpose: "any"`, the default when
omitted) icon for platforms that don't mask. `purpose: "monochrome"` is a third, less common
option: a single-color icon (alpha channel only) some OS badge/notification UIs recolor to
match system theme.

**`screenshots` and richer install UI.** Chromium's install dialog on desktop shows a small
generic prompt by default. Add `screenshots` with a `form_factor` of `"wide"` (desktop-shaped)
or `"narrow"` (phone-shaped), and Chrome upgrades the same install action into a much larger
card with a carousel — the same mechanism Play Store listings use. This is presentation only;
it has no effect on whether the app is installable, only on how persuasive the prompt looks.

## Installability is decided per browser, and the bar has moved

There is no single "is this a PWA" checkbox. Each browser decides for itself, and the rules
have changed meaningfully in the last few years:

- **Chrome/Edge (Chromium).** As of 2023, Chrome **no longer requires a service worker or
  offline support** to fire the install prompt — the older "must respond when offline" rule
  is gone. The current bar is: a valid manifest with `name`/`short_name`, `icons` (192px and
  512px minimum), `start_url`, an installable `display` value, HTTPS, and
  `prefer_related_applications` absent or `false`, plus a lightweight engagement heuristic
  (roughly: some interaction, some time on site) before the browser will surface
  `beforeinstallprompt` unprompted. You can still register a service worker for real offline
  support — that's lesson 85 — but it's no longer the gate for installability itself.
- **Safari (iOS/iPadOS).** Safari has supported home-screen install since early iOS via
  "Add to Home Screen," using non-standard `apple-touch-icon` and
  `apple-mobile-web-app-*` meta tags rather than the manifest for a long time; more recent
  Safari versions read more of the manifest directly (`name`, `icons`, `display: standalone`,
  `theme_color`). Safari has no automatic install prompt or `beforeinstallprompt` — install
  is always a manual "Add to Home Screen" action from the share sheet, and there's no
  programmatic way to trigger it. The EU's 2024 dispute over iOS PWA support (browser-engine
  requirements under the Digital Markets Act) briefly threatened to pull home-screen web apps
  in the EU entirely; Apple walked that back before shipping. Treat any specific iOS 26
  behavioral claim as unverified going into this lesson — confirm current behavior against
  WebKit's release notes before relying on it.
- **Firefox (desktop).** Firefox desktop dropped its own install-prompt UI; there is no
  Chromium-style `beforeinstallprompt` equivalent on desktop Firefox. Firefox for Android
  still supports "Add to Home Screen" via the browser menu.
- **Practical takeaway.** Write the manifest to the full spec regardless of browser — Chrome
  and Edge will use every field, Safari will read a growing subset, and a spec-complete
  manifest costs nothing extra. Don't build your install UX around `beforeinstallprompt`
  alone; it's Chromium-only, and every other browser needs a manual, discoverable
  "how to install" affordance instead. The next concept step covers exactly that split.

## Frameworks generate this file; they don't design it

Vite's [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/) (built on Workbox) will
generate `manifest.webmanifest` from a config object at build time and inject the `<link>`
tag for you — genuinely useful for keeping the manifest and your service worker's precache
manifest in sync. What it will not do is choose your `scope`, pick safe-zone-correct maskable
icon art, or decide whether `window-controls-overlay` makes sense for your app's layout.
Generation is plumbing; the field-by-field decisions above are still yours.

## Further reading

- [MDN — Web app manifest](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest)
- [web.dev — Installability criteria](https://web.dev/articles/install-criteria)
- [MDN — `display_override`](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/display_override)
- [W3C — Web Application Manifest spec (`id` member)](https://www.w3.org/TR/appmanifest/#id-member)
