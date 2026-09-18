# React Native and Expo in 2026, for a React web developer

React Native's own documentation has recommended Expo as the framework
layer to build with since 2024 — not a competing project, the way Next.js
and Remix compete, but the toolchain React Native itself points you at
first. This step is the inventory: what carries over from your React web
habits, what breaks outright, and what Expo's tooling adds on top of
plain React Native.

## What carries over

Components, hooks, context, and state management libraries are unchanged
— a `useReducer` or a Zustand store written for a web app works verbatim
in React Native, because none of it touches the DOM. TanStack Query works
the same way: it's caching and orchestrating promises, not touching
`document` anywhere, so your data-fetching patterns port directly. React
19's newer features — `use()`, Actions, `useActionState`,
`useOptimistic` — are React features, not DOM features, and work in React
Native the same way. If most of your app's logic lives in hooks and plain
functions rather than JSX markup, that logic is not what you'll be
rewriting.

## What does not carry over

Everything that assumes a DOM does not. There is no `<div>`, no
`<span>`, no `<p>` — React Native has its own primitive components:
`View` (a layout container, roughly `<div>`'s role), `Text` (the *only*
place a string is allowed to render — a `View` with a raw text child is a
runtime error, not a warning, because React Native has no browser text
node to fall back to), `Image`, `ScrollView`, `Pressable`. There is no CSS
cascade, no stylesheets that inherit down the tree, no class names. You
write `StyleSheet.create({...})` objects and pass them to a `style` prop,
and — critically — the layout default flips: a `View`'s children lay out
in `flexDirection: 'column'` by default, not row, and there is no
`display: 'block'` at all; everything is flexbox, always. `Image` needs
explicit `width`/`height` (or an aspect ratio) because there's no
intrinsic-size-from-the-file-then-reflow behavior the way an `<img>` has
in a browser. Navigation isn't `<a href>` and browser history; it's a
router — Expo Router, file-based like Next.js's `app/` directory, is the
default recommendation for a new Expo project. And per-platform
differences that CSS media queries or `navigator.userAgent` handled on
the web are handled with dedicated file extensions —
`Button.ios.tsx`,`Button.android.tsx`, `Button.web.tsx` all compiling to
whichever one the target platform picked — or, for a smaller branch,
`Platform.select({ ios, android, web, default })` inline.

## Expo's toolchain

Expo Go, the app most tutorials start with, only runs plain React Native
code — the moment your project needs a native module Expo Go doesn't
ship (a specific camera library, say), you switch to `expo-dev-client`, a
custom build of your own app with Expo's dev tools attached, so you get
fast-refresh development back even with native code included. **Continuous
Native Generation (CNG)** and its command, `npx expo prebuild`, is the
piece that resolves the old "eject" tension: your project stays
declarative (an `app.json`/`app.config.ts` describing what native
capabilities you need) and `prebuild` *generates* the `ios/` and
`android/` native project folders from that config on demand, rather than
you hand-editing and forever owning them. The **Expo Modules API** is how
you (or a library author) write a native module that plugs into that
generated project cleanly. **EAS** is Expo's hosted build/release
pipeline: EAS Build compiles your native binaries in the cloud (no local
Xcode/Android Studio required to ship), EAS Submit pushes the result to
the App Store or Play Store, and EAS Update is the OTA channel mentioned
in the previous step — a JS-only fix goes out over EAS Update in minutes;
anything touching native code needs a new EAS Build and a new store
review.

## Styling, animation, and universal code

Beyond raw `StyleSheet.create`, three styling approaches show up
repeatedly in 2026 React Native codebases: **NativeWind** (Tailwind's
utility classes, compiled to `StyleSheet` objects instead of CSS, now on
v4), **Tamagui** (a styling and universal-component library aimed at
sharing both logic and UI across web and native), and **Unistyles**
(a StyleSheet-adjacent library focused on theming and per-platform
variants without a runtime style-recalculation cost). For animation,
**Reanimated** (versions 3 and 4 both in active use) runs animation logic
on the UI thread instead of bouncing through JS each frame, and pairs
with **Gesture Handler** for touch gestures that need that same
low-latency thread.

"Universal" apps — one codebase targeting iOS, Android, *and* web — lean
on **React Native Web**, which implements the `View`/`Text`/`StyleSheet`
API on top of real DOM elements, so the same component renders correctly
in a browser. **Solito** layers universal *navigation* on top (so Expo
Router-style screens and Next.js pages can share logic), and Tamagui is
often the styling half of that same universal stack. A narrower, additive
tool for the opposite direction — bringing web code into a native app
rather than native code onto the web — is React Native **DOM components**
(the `'use dom'` directive, available since Expo SDK 52): mark a
component with `'use dom'` and it renders inside a native app through an
embedded WebView, letting a team migrate one screen at a time or reuse an
existing web widget without a full rewrite, at the cost of that screen
paying WebView overhead instead of native-view overhead.

## Testing

Unit and component tests use Jest with React Native Testing Library
(RNTL) — same testing philosophy as web Testing Library (query by role
and text, not implementation detail), different renderer underneath.
End-to-end testing on real or simulated devices reaches for **Maestro**
(YAML-defined flows, no code) or **Detox** (JS-driven, gray-box, tighter
React Native integration) rather than Playwright, since there's no
browser or DOM for Playwright to drive.

## The decision matrix

Put concretely, against scenarios rather than abstractions:

| Scenario | Reasonable pick |
|---|---|
| Small team, mostly-static content site, one interactive widget, no App Store need | PWA (lessons 84–86) |
| Need App Store/Play Store listing, app is 90% existing web app, limited native API needs | Capacitor, optionally with Ionic components |
| Need deep native APIs (camera, biometrics, background location), native-feeling scroll/gesture performance, team already knows React | React Native + Expo |
| One pixel-perfect design across every platform including desktop, team willing to learn Dart, less invested in existing React code | Flutter |
| Team is Android/iOS-native already, wants to share business logic (not UI) across platforms | Kotlin Multiplatform |

The axis underneath all of it is **how much you're sharing**: PWAs and
Capacitor share everything, including UI, because it's the same DOM tree
running in a wrapper. React Native shares logic and *a* UI layer, but a
platform-specific one — not the DOM's UI. Flutter and Kotlin
Multiplatform sit further along that spectrum in different ways: Flutter
shares UI too, just not web UI; Kotlin Multiplatform is explicitly
"share logic, keep each platform's native UI." None of these is
strictly more correct — the right one is whichever matches how much of
the app's value is in shared logic versus shared pixels versus native
API depth, weighed against what the team already knows.

## Further reading

- [Expo Router documentation](https://docs.expo.dev/router/introduction/)
- [Expo Application Services (EAS) overview](https://docs.expo.dev/eas/)
- [React Native: Style](https://reactnative.dev/docs/style)
- [Continuous Native Generation](https://docs.expo.dev/workflow/continuous-native-generation/)
