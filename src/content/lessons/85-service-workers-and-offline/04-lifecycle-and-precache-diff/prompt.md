# Model the lifecycle and the precache diff

Two small, pure pieces of logic that a real service worker setup (or
`vite-plugin-pwa`) has to get right, extracted so you can reason about them
without a browser: the update state machine, and the precache manifest
diff.

## `transition(state, event)`

`SwState` is one of `'installing' | 'waiting' | 'active' | 'redundant'`.
`SwEvent` is one of `'install-ok' | 'install-fail' | 'activate' |
'skip-waiting' | 'new-version-found' | 'controller-change'`.

Implement `transition(state, event): { state: SwState; uiAction: UiAction }`
where `UiAction` is `'none' | 'show-update-toast' | 'reload'`, following
these rules exactly:

| From | Event | To | `uiAction` |
|---|---|---|---|
| `installing` | `install-ok` | `waiting` | `none` |
| `installing` | `install-fail` | `redundant` | `none` |
| `installing` | `skip-waiting` | `active` | `none` |
| `waiting` | `activate` | `active` | `none` |
| `waiting` | `skip-waiting` | `active` | `none` |
| `waiting` | `new-version-found` | `waiting` | `show-update-toast` |
| `active` | `new-version-found` | `waiting` | `show-update-toast` |
| `active` | `controller-change` | `active` | `reload` |

Any `(state, event)` pair not in this table — including any event fired
against `redundant`, or `activate`/`controller-change` fired too early — is
invalid: throw an `Error`. `redundant` is a dead end; nothing transitions
out of it.

Two rules worth reading twice: a `new-version-found` while `waiting`
doesn't advance the state — a second, newer worker simply replaces the one
that was already parked, and the toast fires again because the version
that's actually waiting changed underneath it. And `skip-waiting` itself
only ever produces `uiAction: 'none'` — the `reload` action only ever comes
from a later, separate `controller-change` event, mirroring the real
`postMessage → controllerchange → reload` handshake from the concept step.

## `revisionDiff(oldManifest, newManifest)`

Both manifests are arrays of `{ url: string; revision: string | null }` —
Workbox's precache entry shape. Return `{ add, remove, keep }`, each an
array of entries:

- **`remove`**: entries whose `url` is in `oldManifest` but not in
  `newManifest` at all.
- **`add`**: entries that need to be (re)fetched — new URLs not in
  `oldManifest`, or URLs present in both but whose content changed.
- **`keep`**: entries already correctly cached — no work needed.

The catch: a **hashed** filename — a URL with a `[.-][a-f0-9]{8,}\.`
segment right before the extension, e.g. `/assets/main.a1b2c3d4.js` or
`/assets/main-9f8e7d6c5b4a.css` — is *self-revisioned*. The hash already
changes whenever the content does, so for a hashed URL, matching on the URL
alone is enough to `keep` it; ignore its `revision` field entirely (it may
even be `null`). For every other URL, compare `revision` between the two
manifests: same value keeps it, a different value means `add`.
