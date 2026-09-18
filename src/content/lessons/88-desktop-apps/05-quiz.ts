import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        "A developer scaffolds a new Electron app, sets `nodeIntegration: true` on the main window \"to keep things simple,\" and plans to add a preload script and `contextBridge` \"later, once the API surface settles.\" What's the actual risk of that ordering, given that the window also renders some HTML built from a remote API response?",
      choices: [
        {
          id: 'a',
          text: 'None — contextBridge and nodeIntegration are independent features, so adding contextBridge later works the same regardless of when nodeIntegration is turned off.',
        },
        {
          id: 'b',
          text: "With nodeIntegration on, any injected or templated HTML rendered in that window already has a full Node.js runtime available to it — require, fs, child_process — so a markup-injection bug in how the remote response is rendered is not just an XSS, it's remote code execution, from day one, regardless of when contextBridge gets added.",
        },
        {
          id: 'c',
          text: "The risk only applies once contextBridge is added, since contextBridge is what actually exposes Node APIs to the page.",
        },
      ],
      correctChoiceId: 'b',
      explanation:
        "nodeIntegration and contextIsolation gate whether page script has any Node.js runtime at all, independent of whether a preload/contextBridge layer exists yet. Rendering remote-influenced content in a nodeIntegration: true window is dangerous the moment that's true, not once some later API-design step happens — which is exactly why contextIsolation and nodeIntegration: false became Electron's defaults rather than opt-ins.",
    },
    {
      id: 'q2',
      prompt:
        "Two teams compare notes. Team A's Electron preload exposes `ipcRenderer` directly via `contextBridge.exposeInMainWorld('electron', { ipcRenderer })`, so page code can call `window.electron.ipcRenderer.invoke(anyChannelString, ...anyArgs)`. Team B's preload exposes `contextBridge.exposeInMainWorld('api', { getUser: (id) => ipcRenderer.invoke('get-user', id) })`. Both use contextIsolation. What's the real difference?",
      choices: [
        {
          id: 'a',
          text: "None — contextIsolation is what matters, and both preloads run under it identically.",
        },
        {
          id: 'b',
          text: "Team A's page code can invoke *any* channel main happens to handle, with any arguments, because it received the raw invoke primitive — contextIsolation stops page script from reaching into preload's scope, but it does nothing to narrow what preload itself chooses to hand over; Team B's page code can only ever trigger the one call preload explicitly wrote, which is what actually makes the allowlist mean anything.",
        },
        {
          id: 'c',
          text: "Team B's approach is strictly slower, since it wraps every call in an extra function.",
        },
      ],
      correctChoiceId: 'b',
      explanation:
        "contextIsolation protects the boundary between page script and preload script; it says nothing about how generously preload re-exposes what it has access to. Exposing the raw ipcRenderer.invoke effectively erases any allowlist main might enforce, since page code can now name any channel itself — the security value of the preload layer comes entirely from preload choosing to expose specific, narrow functions instead of the underlying primitive.",
    },
    {
      id: 'q3',
      prompt:
        "A Tauri 2 app has a main window and a separate settings window. Someone proposes giving both windows the same capability set \"to avoid maintaining two configs.\" What does this ignore about what Tauri 2's capabilities system is for?",
      choices: [
        {
          id: 'a',
          text: 'Nothing meaningful — capabilities only affect startup performance, not what a window can actually do.',
        },
        {
          id: 'b',
          text: "Capabilities are scoped per window specifically so that a window with a narrower job (like a settings screen) can be denied commands and plugin permissions a main window needs — merging them into one shared capability set means the settings window inherits every permission the main window has, even ones it has no legitimate reason to use, which is exactly the excess-privilege problem per-window scoping exists to prevent.",
        },
        {
          id: 'c',
          text: "Capabilities can only be defined once per app regardless of window count, so the proposal is simply describing how Tauri already works.",
        },
      ],
      correctChoiceId: 'b',
      explanation:
        "Tauri 2's capabilities/permissions ACL exists precisely to let different windows in the same app hold different privilege sets. Collapsing them into one shared set for convenience defeats the purpose — a compromised or buggy settings window would then have the same reach as the main window, rather than being contained to what it actually needs.",
    },
    {
      id: 'q4',
      prompt:
        "A small internal tool needs a taskbar icon, remembers window position across launches, and occasionally needs to read a local config file the OS's file picker would make annoying to reach every time — nothing more exotic than that. The team is choosing between Electron and Tauri 2 and leans Electron because \"more people here already know JavaScript than Rust.\" Is that reasoning sound?",
      choices: [
        {
          id: 'a',
          text: "No — Tauri 2 requires writing the entire application logic in Rust, so a JS-only team cannot use it at all.",
        },
        {
          id: 'b',
          text: "It's a reasonable factor, but incomplete on its own: with Tauri, the team's own application code (the React UI, most of the logic) stays JavaScript/TypeScript — Rust is only needed for the thin `#[tauri::command]` layer, which for a tool this modest might be a handful of small functions. Team language fluency matters, but it should be weighed against the actual size of the Rust surface a project this simple would need, not treated as an all-or-nothing blocker.",
        },
        {
          id: 'c',
          text: "It's irrelevant — Electron and Tauri produce identical binaries regardless of which languages the team is comfortable with.",
        },
      ],
      correctChoiceId: 'b',
      explanation:
        "Tauri doesn't ask a team to rewrite their UI in Rust — the frontend stays whatever web stack they already use, and Rust is confined to the command layer and any native plugins. For a genuinely small native-integration surface, that Rust footprint can be tiny, so \"we don't know Rust\" is a real cost to weigh, not a hard wall, and it should be weighed against Tauri's binary-size and patch-cadence advantages for this particular tool rather than deciding the question by itself.",
    },
    {
      id: 'q5',
      prompt:
        "An update pipeline downloads a manifest, checks `manifest.version` against the installed version and decides whether to update, and only afterward calls `verify(manifest, manifest.signature)` — logging a warning (but not blocking the already-started download) if verification fails. What's the concrete consequence of that ordering?",
      choices: [
        {
          id: 'a',
          text: "None — as long as verification eventually runs before the update is *installed*, checking the version first is just an optimization that skips unnecessary verification work.",
        },
        {
          id: 'b',
          text: "By the time verification runs, the client has already trusted the manifest's version field enough to decide to fetch a payload from `manifest.url` — an attacker who can serve a forged manifest with a newer-looking version now gets to control what the client fetches and from where before any check on the manifest's authenticity happens, which is precisely the failure signature verification first is meant to prevent.",
        },
        {
          id: 'c',
          text: "This ordering is fine specifically because logging a warning still gives the operator a chance to react before real damage occurs.",
        },
      ],
      correctChoiceId: 'b',
      explanation:
        "Verifying first, before parsing or acting on anything else in the manifest, is the whole point of putting bad-signature ahead of every other rule in the decision order: an unverified manifest is untrusted data, and deciding to fetch a URL from it (even if the actual install step is gated later) already extends trust to an attacker-controlled source. A warning logged after the fact doesn't undo a fetch that already happened against a malicious URL.",
    },
    {
      id: 'q6',
      prompt:
        "A team's product is a well-maintained PWA. Leadership asks for \"a real desktop app\" so it shows up with an icon and appears in Task Manager like other installed software, and nothing else changes about what the app does. An engineer proposes wrapping it in Electron. What's the strongest pushback?",
      choices: [
        {
          id: 'a',
          text: "Electron cannot produce a taskbar icon or show up as a running process, so the proposal doesn't meet the stated requirement.",
        },
        {
          id: 'b',
          text: "A PWA installed via the browser (or wrapped with window-controls-overlay, lesson 84) already gets an OS icon, its own window, and appears as its own process in Task Manager/Activity Monitor on every major desktop OS today — an Electron wrapper would satisfy the stated requirement too, but at the cost of a bundled Chromium to patch, a packaging and signing pipeline, and an auto-update system to build, for a requirement the existing PWA install path already meets.",
        },
        {
          id: 'c',
          text: 'The pushback should be that Tauri is strictly better than Electron for this case, not that a native wrapper is unnecessary at all.',
        },
      ],
      correctChoiceId: 'b',
      explanation:
        "The requirement as stated — icon, native-feeling presence, nothing functionally new — is exactly what an installed PWA already provides without a second codebase, a bundled browser to maintain, or a signing/notarization/auto-update pipeline to stand up. Reaching for Electron or Tauri makes sense once the requirement is something a PWA genuinely can't do (unrestricted filesystem access, a background process independent of any window, bundling a native dependency) — not for \"make it feel more like an app,\" which the platform already solves.",
    },
  ],
};
