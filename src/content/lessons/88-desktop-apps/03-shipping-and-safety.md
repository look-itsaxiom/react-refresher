# Shipping and keeping it safe

A desktop app is a binary you distribute, not a URL you deploy. That changes what "secure"
and "updated" mean, and it's where most real-world Electron CVEs actually came from —
not exotic bugs, but a handful of misconfigurations repeated across projects.

## The misconfigurations that became CVEs

Electron publishes a security checklist (roughly 20 items in the current docs); a small
subset accounts for most disclosed vulnerabilities in Electron apps:

- **`webPreferences` misconfig** — `nodeIntegration: true` or `contextIsolation: false` on a
  window that loads any remote or user-influenced content hands that content a Node.js
  runtime. Combined with a reflected-content or template-injection bug elsewhere in the app,
  this is remote code execution, not just an XSS.
- **`shell.openExternal(url)` with an untrusted URL** — this asks the OS to open `url` with
  its default handler. An attacker-controlled string can point at a `file://` URI, a crafted
  custom protocol another installed app registered, or (on some platforms, some versions) be
  used to smuggle OS command arguments. Validate the URL and its scheme before calling it —
  never pass through a string a remote page or IPC message supplied.
- **Navigation to remote content** — leaving `will-navigate` and `setWindowOpenHandler`
  unhandled lets a compromised or malicious link inside your app navigate the window (or open
  a new one) to an origin you never audited, now running with whatever `webPreferences` that
  window has. Guard both: allow navigation only to known origins, deny (or hand off to
  `shell.openExternal` after validation) everything else — the same three-way decision
  `guardNavigation` makes in this lesson's exercise.
- **`allowRunningInsecureContent: true`** — permits HTTP subresources inside an HTTPS page,
  reopening the mixed-content holes browsers spent a decade closing. It defaults to `false`;
  there's no production reason to flip it.

A Content-Security-Policy header or `<meta>` tag still applies inside Electron's renderer —
set one, restrict `script-src` to your own bundled files, and you close off a class of
injection bugs even if some other check lapses. Tauri sets CSP in `tauri.conf.json`, applied
by the Rust core to every window; because there's no Node runtime in the WebView to escalate
to, a CSP bypass there is a more contained failure than the same bypass in a
`nodeIntegration: true` Electron window.

## Packaging, per OS

| OS | Formats | Electron tooling | Tauri tooling |
|---|---|---|---|
| macOS | `.dmg`, `.pkg` | Electron Forge / electron-builder | Tauri CLI (`tauri build`) |
| Windows | `.msi`, NSIS `.exe`, `.msix` | Electron Forge / electron-builder | Tauri CLI (NSIS or WiX/MSI) |
| Linux | `.deb`, `.rpm`, AppImage, Flatpak | Electron Forge / electron-builder | Tauri CLI |

Electron Forge and electron-builder both wrap the same underlying packaging tools
(electron-builder leans more toward auto-update integration out of the box; Forge leans
toward a plugin-based, officially-maintained pipeline). Electron apps are typically packed
into an **ASAR** archive — a single concatenated file that speeds up filesystem reads for
thousands of small source files and makes casual tampering slightly harder, though ASAR is
not encryption and shouldn't be treated as one.

Every platform wants the binary **signed**: Apple requires code signing plus
**notarization** (Apple's automated malware scan) before Gatekeeper will run an unmodified
download without a warning; Windows uses Authenticode signing, increasingly via cloud
signing services like Azure Trusted Signing rather than a locally-held certificate; Linux
package formats vary in whether they enforce signing at all. Skipping this doesn't just look
unpolished — unsigned installers trigger OS-level warnings that read as "this is probably
malware" to most users.

## Auto-update: the shape that keeps you safe

Electron's `autoUpdater` (commonly driven through `electron-updater`, the electron-builder
companion) checks a hosted manifest, downloads a new build, and applies it — historically via
Squirrel on Windows/macOS, or through Electron's own hosted `update.electronjs.org` service
for GitHub-releases-based apps. Tauri's updater plugin does the equivalent: fetch a manifest,
verify it, download, apply, using **minisign** keypairs to sign the manifest so the client
can verify authenticity before trusting a byte of it.

Whichever stack, a trustworthy update flow needs the same four properties:

1. **Signature verification before anything else.** Verify the manifest's signature against
   a public key baked into the app, before parsing versions or deciding whether to download.
   An update pipeline that verifies after acting on the manifest's contents has already lost.
2. **Staged rollout.** Ship to a percentage of the install base first (a device-id hash into
   a 0–99 bucket, compared against a rollout percentage) so a bad build reaches thousands, not
   millions, before you notice and halt it.
3. **A forced-update floor.** When a manifest sets a minimum supported version, clients below
   it must update regardless of rollout gating — this is how you retire a build with a known
   security hole instead of leaving it eligible to keep running indefinitely.
4. **Rollback.** Keep the previous good build (or its manifest) reachable so "the new version
   is broken" has an answer other than shipping a fix under time pressure.

## Testing and the PWA off-ramp

Playwright has first-class Electron support (`_electron.launch`) for driving main and
renderer together in CI; Tauri apps are commonly driven with WebdriverIO plus `tauri-driver`,
since Tauri's WebView isn't a Playwright-controllable browser process. Either way, test the
IPC boundary itself, not just the rendered UI: a passing UI test tells you the happy path
renders, not that a malicious renderer message can't reach a handler it shouldn't.

Before reaching for either framework, revisit whether you need one at all. If the ask is
"an icon on the desktop and a window that remembers state," a PWA with `window-controls-overlay`
and the file-handling/badging APIs (lesson 84) ships today, updates instantly with no
store or manifest signing step, and has no separate binary to sign or notarize. Reach for
Electron or Tauri when the requirement is specifically native: filesystem access without a
picker dialog, a persistent background process, a system tray icon, or bundling a native
dependency (a local database engine, a hardware SDK) the browser sandbox can't reach.

## Further reading (optional)

- [Electron Security Checklist](https://www.electronjs.org/docs/latest/tutorial/security)
- [Tauri 2: Updater plugin](https://v2.tauri.app/plugin/updater/)
- [Playwright: Electron support](https://playwright.dev/docs/api/class-electron)
- [web.dev: Signing and notarizing desktop apps](https://web.dev/articles/pwas-as-apps)
