# Where data lives in the browser

You already know `localStorage.setItem`. The harder question — the one that shows up in
real apps — is which of the five storage mechanisms to reach for, and what each one
quietly assumes about size, durability, and who else can read it.

## The five mechanisms

**Cookies** are the odd one out: they're the only storage mechanism the *server* can set
(via `Set-Cookie`) and the only one automatically attached to every matching HTTP request.
That round-trip cost is why cookies are capped hard — about 4KB per cookie, roughly 50
cookies per domain depending on the browser — and why you should never store anything
non-trivial in one. Their real job in 2026 is auth session identifiers and CSRF tokens,
ideally `HttpOnly` (unreadable from JS, blocking a whole class of XSS token theft),
`Secure`, and `SameSite=Lax` or `Strict`.

**`localStorage` / `sessionStorage`** (the Web Storage API) are synchronous, string-only
key/value stores. Synchronous is the key word: every `getItem`/`setItem` call blocks the
main thread, including any JS running from other same-origin tabs sharing that storage
area, because it's backed by a lock. For small settings blobs that's invisible. For
anything you'd call "data" — hundreds of rows, blobs, anything you query — synchronous
access on the main thread is a liability, not a convenience. `sessionStorage` is scoped
per tab (not shared, even same-origin) and cleared when the tab closes; `localStorage`
persists until cleared and is shared across all tabs of the same origin.

**IndexedDB** is the browser's real database: asynchronous, transactional, and able to
store structured data via the [structured clone algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm) — so unlike Web Storage, you can put actual objects, `Blob`s, `Map`s,
and `Date`s in without hand-rolling `JSON.stringify`. It has object stores instead of
tables, indexes for querying by a field other than the key, and a versioning model:
opening a database with a higher version number than what's stored triggers an
`onupgradeneeded` callback where you create/alter object stores — there is no "migrate
this column" SQL, you write imperative upgrade code. The raw API is notoriously verbose
(callback- and event-based, not promise-based), which is why almost nobody uses it
directly — [`idb`](https://github.com/jakearchibald/idb) wraps it in promises with
almost no ceremony, and [Dexie](https://dexie.org/) adds a query layer on top. Use
IndexedDB (via a wrapper) for offline-first data, caches too big for Web Storage, or
anything you need to query.

**The Origin Private File System (OPFS)**, part of the File System Access API, gives an
origin a private, sandboxed directory tree with real file semantics — streamed writes,
byte-range reads, and (in a Worker) a synchronous access handle fast enough for SQLite
and other WASM databases to run *in the browser* at near-native speed. It shipped in
Chrome/Edge since 86, Firefox since 111, and Safari since 15.2, so as of 2026 it's
supported everywhere, though Safari disables it in Private Browsing. Reach for OPFS when
you're shipping a WASM database or need file-like access (SQLite via
[wa-sqlite](https://github.com/rhashimoto/wa-sqlite), video editors, code sandboxes) —
not as a `localStorage` replacement for ordinary app state.

**The Cache API** stores `Request`/`Response` pairs, keyed by request. It's the
persistence layer service workers use for offline assets and API responses, and it's
usable directly (`caches.open(name)`) without a service worker if you just want to cache
fetch responses yourself. Think "an HTTP cache you control programmatically," not general
key/value storage.

## Quotas, eviction, and persistence

Everything except cookies shares a per-origin storage quota that the browser estimates
dynamically (a fraction of free disk space) rather than a fixed number — check it with
[`navigator.storage.estimate()`](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/estimate),
which returns `{ usage, quota }` in bytes. When the browser is low on disk, it evicts
*origins*, not individual keys, using a "best-effort" bucket by default — usually the
least-recently-used origin the user hasn't bookmarked or installed as a PWA. Calling
[`navigator.storage.persist()`](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist)
requests the "persistent" bucket instead, which is exempt from that eviction (the browser
may still prompt the user or grant it silently based on engagement heuristics — it's a
request, not a guarantee). Check `navigator.storage.persisted()` to see if you already
have it.

## Partitioning changed the rules

Third-party storage used to mean "shared across every site that embeds you." That's
mostly gone: Firefox's Total Cookie Protection, Safari's long-standing full third-party
cookie blocking, and Chrome's storage partitioning (via CHIPS —
[Cookies Having Independent Partitioned State](https://developer.mozilla.org/en-US/docs/Web/Privacy/Guides/State_Partitioning))
now give a third-party origin a *separate* storage bucket per top-level site it's embedded
in by default. An analytics widget embedded on `a.com` and `b.com` gets two unrelated
storage areas, not one shared one. If your embedded widget genuinely needs unpartitioned,
cross-site storage — an SSO iframe, say — it has to explicitly ask via the
[Storage Access API](https://developer.mozilla.org/en-US/docs/Web/API/Storage_Access_API)'s
`document.requestStorageAccess()`, which the browser may grant automatically (existing
first-party relationship) or gate behind a user gesture and prompt.

## Cross-tab sync for free

`localStorage` gives you cross-tab messaging you didn't have to build: any tab that calls
`setItem`/`removeItem`/`clear` fires a `storage` event on `window` in **every other**
same-origin tab (never the tab that made the change). The event carries `key`,
`oldValue`, `newValue`, and `storageArea`, which is enough to react to a write from
another tab without polling. That's the mechanism behind "log out in one tab, every open
tab logs out," and it's what you'll use in the next exercise to keep a persisted store in
sync across tabs.

## Further reading (optional)

- [MDN: Client-side storage overview](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Client-side_APIs/Client-side_storage)
- [web.dev: The origin private file system](https://web.dev/articles/origin-private-file-system)
- [MDN: Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [MDN: State partitioning](https://developer.mozilla.org/en-US/docs/Web/Privacy/Guides/State_Partitioning)
