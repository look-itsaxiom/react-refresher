# Four ways to ship web skills to phones

Lessons 84–86 covered the PWA stack in depth: manifests, service workers,
push, and platform capabilities. This lesson treats that stack as one
option among four, and puts it next to the others a team actually
compares it to: Capacitor (with Ionic as its usual UI layer), React Native
with Expo, and — as the non-web comparison point that clarifies what "web
skills" even means — Flutter. For each, the same three questions: what
does it render, how does it talk to the native platform, and how does an
update reach a device.

## Option 1: PWA (and Trusted Web Activity)

A PWA is the app you already built in lessons 84–86, installed rather than
bookmarked. It renders the DOM, same as any web page — no native views,
no bridge, just a browser engine (WebKit on iOS, Chromium-derived on
Android) running your app in a standalone window. It talks to native
capabilities only through whatever the browser exposes: notifications,
badging, file handling, geolocation — real, but a strict subset of a
native SDK's surface. Updates ship the instant you deploy: no store
review, no binary, the service worker fetches the new build on the user's
next visit. On Android, a Trusted Web Activity (TWA, built with
Bubblewrap or PWABuilder) wraps that same PWA in a thin native shell so it
can list on the Play Store — still rendering your web app, just inside a
store-distributable package. iOS has no TWA equivalent; a PWA there is
installed straight from Safari's share sheet and never appears in the App
Store. This is the cheapest option by a wide margin when the app's needs
fit inside what a browser exposes.

## Option 2: Capacitor (usually with Ionic) — WebView plus a plugin bridge

Capacitor takes the same web app — any web app, not just a PWA-shaped one
— and runs it inside a native WebView wrapped in a real native binary, so
it *can* list on both the App Store and Play Store. The rendering is still
entirely DOM and CSS; nothing about your component tree changes. What
Capacitor adds is a plugin bridge: native code you can call from
JavaScript (camera, filesystem, biometrics, push) through a plugin API,
each plugin providing both a native implementation and a web fallback so
the same call works in a browser during development. Ionic Framework is
the UI component library most Capacitor apps reach for — buttons, tabs,
and modals styled to feel native on each platform — but it's optional; a
plain React app with `@capacitor/core` and a couple of plugins is a
complete Capacitor app on its own. Updates split in two: the WebView
content (your HTML/JS/CSS) can ship instantly via Capacitor Live Updates,
without a store review, but the native shell itself — the binary, any
native plugin code — still goes through normal store review when it
changes. Ionic Framework's ownership changed hands (OutSystems acquired
it in 2023); worth a quick current-status check before betting a large
project on its long-term roadmap, but Capacitor itself is maintained
independently and is the piece that matters for this comparison.

## Option 3: React Native with Expo — native views driven by JavaScript

This is the option that stops rendering the DOM at all. Your JavaScript
runs on-device (Hermes, React Native's JS engine, by default) and
produces real native views — `UIView` on iOS, `android.view.View` on
Android — not a WebView showing HTML. There is no CSS cascade, no `<div>`;
component 20 or so of this course's PWA lessons' assumptions about the DOM
stop applying entirely here, which is why the next concept step spends so
much time on what carries over and what doesn't.

How JS talks to native is the part that changed most recently and is
worth naming precisely, because "the bridge" is a term you'll see in
older material and need to un-learn. Through React Native 0.75, JS and
native communicated over an asynchronous, serializing **bridge**: every
call — layout, a native module invocation — was JSON-serialized, batched,
and sent across, which capped how fast JS and native could talk and made
synchronous native calls impossible. **New Architecture**, the default
since React Native 0.76 (October 2024), replaces it with three pieces:
**JSI** (JavaScript Interface), a C++ layer that lets JS hold direct
references to native objects and call their methods synchronously, no
serialization; **Fabric**, the new renderer built on JSI that manages the
native view tree with less overhead than the old bridge-mediated one; and
**TurboModules**, native modules loaded lazily and called through JSI
instead of the bridge. Together this is what people mean by "bridgeless"
— the bridge isn't optimized, it's gone. As of this writing (September
2026) the legacy architecture is deprecated and being removed from
current React Native releases; if you're picking up an older codebase,
confirm which architecture it's actually running before assuming any of
this applies. Expo is React Native's own docs' recommended framework
layer on top of this (not a competing thing) — its role is the whole
subject of the next concept step.

Updates: a native code or dependency change requires a new binary and
store review, same as any native app. But JS-only changes (component
logic, most bug fixes) can ship over the air through EAS Update or a
similar OTA mechanism — no store review, similar in spirit to Capacitor
Live Updates, but for actual React Native code rather than WebView
content.

## Option 4: Flutter — the non-web comparison

Flutter isn't a way to reuse web skills; it's useful here precisely as
the thing that isn't one, so you can recognize when a client actually
wants it. Dart, not JavaScript. Widgets, not components rendered to a DOM
or to native views — Flutter draws its own UI with its own renderer
(Impeller, its current default rendering engine) directly onto a canvas
on every platform, which is why a Flutter app looks pixel-identical on
iOS and Android by default rather than adopting each platform's native
look. No React, no CSS, no DOM at any layer. A team with deep React
investment gains nothing from choosing Flutter, but a team without that
investment, prioritizing one visual design across every platform and
willing to learn Dart, may prefer it over any of the three web-rooted
options above. On the native side, Kotlin Multiplatform and Compose
Multiplatform are doing something similar in spirit to Flutter — share
logic or UI across Android/iOS/desktop from a JVM-family language — worth
knowing exists, not worth a deep detour in a course about web skills.

## Further reading

- [React Native architecture overview](https://reactnative.dev/architecture/overview)
- [React Native 0.76: The New Architecture is here](https://reactnative.dev/blog/2024/10/23/the-new-architecture-is-here)
- [Capacitor documentation](https://capacitorjs.com/docs)
- [Flutter architectural overview](https://docs.flutter.dev/resources/architectural-overview)
