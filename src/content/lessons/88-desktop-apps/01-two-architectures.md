# Two architectures for a web UI on the desktop

You already know how to build the UI. The question a desktop wrapper answers is: whose
process model, whose renderer, and whose security boundary do you inherit to get that UI
onto a user's machine as an installable app? In 2026 the two real answers are Electron and
Tauri 2, and they make opposite bets on almost every axis.

## Electron: bundle the browser, split the process

Electron ships a specific version of Chromium and Node.js inside your app. Every window is
a **renderer process** running your React tree in that bundled Chromium; a single **main
process** (Node.js, no DOM) owns native menus, windows, file dialogs, and anything the OS
gates. Electron 22 added **utility processes** — Node processes you spawn for CPU-heavy or
untrusted work (a codec, a parser) without loading them into main or blocking the UI thread.

The renderer and main process don't share memory or call each other's functions directly —
they pass messages. That boundary is also Electron's security boundary, and its shape has
tightened release over release:

- **`nodeIntegration: false`** has been the default since Electron 5 (2019): a renderer
  loading remote or even local HTML doesn't get `require`, `fs`, or `child_process` for free.
- **`contextIsolation: true`** has been the default since Electron 12 (2021): your preload
  script and the page's own JavaScript run in separate JS contexts even though they share a
  DOM, so page script can't reach into preload's scope and repatch what it exposed.
- **`sandbox: true`** has been the default since Electron 20 (2022): the renderer process
  itself runs under the OS-level sandbox Chromium uses for web content, with no Node.js
  environment at all, preload included, unless you opt out.

Given all three defaults, the only sanctioned channel between renderer and main is a
**preload script** calling `contextBridge.exposeInMainWorld` to hand the page a narrow,
explicit API — not the raw IPC primitives, not Node. The main side answers with
`ipcMain.handle('channel', fn)`; the renderer calls `ipcRenderer.invoke('channel', ...args)`
through whatever the preload exposed. Nothing reaches main that isn't a channel you named
and a handler you wrote — the same allowlist shape you'll build in the next exercise.

Electron tracks a stable Chromium release roughly every 8 weeks and keeps 3 stable Electron
lines supported at a time (hedge: exact numbers move; check the release page for the current
count before relying on it for a real project). That cadence is a maintenance cost you accept
in exchange for one Chromium, one V8, one set of DOM quirks, identical across Windows, macOS,
and Linux — which is Electron's actual pitch: rendering consistency, at the cost of shipping
your own browser. Typical unpacked app sizes land in the **150–250 MB** range (hedge — varies
by how much of Chromium's locale/resource data you strip and whether you use ASAR
packaging), because every install carries that bundled Chromium and Node runtime.

## Tauri 2: Rust core, the OS's own WebView

Tauri inverts the bet. The app's backend is a small Rust binary; the window is rendered by
whatever WebView the OS already ships — WebView2 (Chromium-based, but Microsoft's, not
yours) on Windows, WKWebView (Safari's engine) on macOS, WebKitGTK on Linux. You don't bundle
a browser, so binaries commonly land in the **3–10 MB** range (hedge — grows with bundled
assets and plugins) instead of hundreds. The tradeoff is real: three different rendering
engines means three different sets of CSS/DOM quirks and performance characteristics to
verify, where Electron gives you one.

Tauri 2 (stable since October 2024) replaces Electron's IPC-and-preload story with
**commands**: a Rust function annotated `#[tauri::command]`, called from the frontend with
`invoke('command_name', { args })`. There's no preload script because there's no Node
context to isolate the page from — the Rust side is a different process and a different
language, not a JS sandbox you have to configure correctly. What Tauri 2 added on top is a
**capabilities and permissions ACL**: each window declares, in configuration, exactly which
commands and plugin permissions it may use, scoped per window rather than granted globally to
the whole app. A settings window and a main window can hold different capability sets in the
same app. Official and community **plugins** (`tauri-plugin-*`) add filesystem, shell,
notification, and updater access behind that same permission model, and Tauri 2 extended the
same Rust core to **iOS and Android** targets, which Electron doesn't attempt.

## What the choice actually costs

| | Electron | Tauri 2 |
|---|---|---|
| Rendering | One Chromium, identical everywhere | OS WebView, differs per platform |
| Typical size | ~150–250 MB (hedge) | ~3–10 MB (hedge) |
| Backend language | JavaScript/TypeScript + Node | Rust |
| IPC boundary | preload + contextBridge + ipcMain/ipcRenderer | `#[tauri::command]` + capability ACL |
| Patch cadence | You ship Chromium updates yourself | You inherit the OS's WebView patch cycle |
| Mobile | No | iOS/Android since v2 |

Neither number is free. Electron's size buys rendering certainty and a JS-only stack;
Tauri's size buys a tiny binary and Rust's safety guarantees, at the cost of a second
language on the team and three WebViews to test against instead of one. A PWA with
`window-controls-overlay` (lesson 84) is enough for a large slice of "desktop-ish" needs
without either — reach for Electron or Tauri only once you need real OS integration: a
system tray icon that survives the browser closing, file-system access without a picker,
or a native installer.

## Further reading (optional)

- [Electron: Process Model](https://www.electronjs.org/docs/latest/tutorial/process-model)
- [Electron: Context Isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation)
- [Tauri 2: Architecture](https://v2.tauri.app/concept/architecture/)
- [Tauri 2: Permissions and Capabilities](https://v2.tauri.app/security/permissions/)
