import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A feature needs to cache about 50MB of API responses for offline use, queryable by a secondary field (not just the key). Which storage mechanism fits, and why not the alternatives?',
      choices: [
        {
          id: 'a',
          text: 'localStorage — it is simple and synchronous, so there is nothing to get wrong.',
        },
        {
          id: 'b',
          text: 'IndexedDB (via a wrapper like idb or Dexie) — it is asynchronous so it will not block the main thread at that size, stores structured data without hand-rolled JSON, and supports indexes for querying by a non-key field, which Web Storage and the Cache API cannot do.',
        },
        {
          id: 'c',
          text: 'Cookies — the browser sends them with every request, which keeps the server in sync automatically.',
        },
      ],
      correctChoiceId: 'b',
      explanation:
        'localStorage is synchronous (a real cost at 50MB) and string-only. Cookies are capped around 4KB and add latency to every HTTP request. The Cache API keys by request, not by an arbitrary field. IndexedDB is the only one built for size, structure, and querying together.',
    },
    {
      id: 'q2',
      prompt:
        'An IndexedDB database is opened with a higher version number than what is currently stored on disk. What actually happens, and what is the developer responsible for?',
      choices: [
        {
          id: 'a',
          text: 'The database silently keeps the old schema; version numbers are metadata only and have no runtime effect.',
        },
        {
          id: 'b',
          text: 'The browser runs an onupgradeneeded callback in which the developer imperatively creates, deletes, or restructures object stores and indexes — there is no declarative schema migration, unlike a SQL ALTER TABLE.',
        },
        {
          id: 'c',
          text: 'All existing data is automatically deleted and the database is recreated empty at the new version.',
        },
      ],
      correctChoiceId: 'b',
      explanation:
        "IndexedDB's versioning model fires onupgradeneeded exactly once, with the old and new version both available, and it's on the developer to write the upgrade logic — add an object store, backfill an index, whatever the version bump requires.",
    },
    {
      id: 'q3',
      prompt:
        'A widget embedded via iframe on many different customer sites used to share one storage bucket across all of them. In a 2026 browser, what changed by default, and what does the widget do if it genuinely needs the old shared behavior?',
      choices: [
        {
          id: 'a',
          text: 'Nothing changed — third-party storage sharing still works exactly as before in every major browser.',
        },
        {
          id: 'b',
          text: 'Storage is now partitioned per top-level site by default (CHIPS/Total Cookie Protection style), so the widget gets a separate bucket on each host site; to get unpartitioned, cross-site storage it must call document.requestStorageAccess() and the browser may prompt or grant it based on the existing relationship.',
        },
        {
          id: 'c',
          text: 'The widget must switch entirely to server-side sessions; there is no client-side mechanism to request unpartitioned storage anymore.',
        },
      ],
      correctChoiceId: 'b',
      explanation:
        'Storage partitioning is now the default across major engines. The Storage Access API is the sanctioned escape hatch for a legitimate cross-site use case like SSO, via requestStorageAccess() — not a way around user consent, but a defined path through it.',
    },
    {
      id: 'q4',
      prompt:
        'Two open tabs of the same app both keep a counter in localStorage. Tab A increments it. Does Tab A get a `storage` event for its own write, and does Tab B?',
      choices: [
        { id: 'a', text: 'Both tabs get the event, since they share the same localStorage.' },
        {
          id: 'b',
          text: "Tab B gets the storage event; Tab A, the one that made the change, never does — that's the mechanism, not a bug to work around.",
        },
        { id: 'c', text: 'Neither tab gets an event; storage events only fire for sessionStorage, not localStorage.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "The storage event is explicitly scoped to \"every other document sharing the storage area,\" never the one that made the write. That asymmetry is why cross-tab sync code only needs a listener, not a check for \"did I cause this.\"",
    },
    {
      id: 'q5',
      prompt:
        'A ResizeObserver callback sets the observed element\'s own `style.height` based on its measured size, and the console fills with "ResizeObserver loop completed with undelivered notifications." What is actually happening?',
      choices: [
        {
          id: 'a',
          text: 'A real bug in the browser; the fix is to wrap the observer creation in a try/catch to suppress the error.',
        },
        {
          id: 'b',
          text: "The callback resizes the very element it's observing, which would re-trigger the observer in an unbounded loop; the browser cuts the cycle and reports it — the fix is to not let the callback change a size dimension of its own observed target.",
        },
        {
          id: 'c',
          text: 'ResizeObserver has a hard limit of one callback per page; a second one always throws this error.',
        },
      ],
      correctChoiceId: 'b',
      explanation:
        "This message is the browser's built-in protection against an observer that would otherwise resize-trigger-resize forever. It's a signal to change the callback's logic (observe a wrapper instead of the sized element, or write a different dimension), not something to silence.",
    },
    {
      id: 'q6',
      prompt:
        'A team wants to save an in-progress form draft "when the user is about to leave the page." Why is `beforeunload` a weaker choice than `visibilitychange`/`pagehide` for this, especially on mobile?',
      choices: [
        {
          id: 'a',
          text: 'beforeunload is deprecated syntax that no browser still supports.',
        },
        {
          id: 'b',
          text: "beforeunload often does not fire at all when a mobile OS simply kills the backgrounded process, and using it also blocks back/forward-cache eligibility; visibilitychange reliably fires when the tab is backgrounded, which is the actual moment to flush state on mobile.",
        },
        {
          id: 'c',
          text: 'They are interchangeable; the only difference is naming.',
        },
      ],
      correctChoiceId: 'b',
      explanation:
        "Mobile OSes frequently terminate backgrounded tabs without ever running beforeunload, and browsers increasingly penalize pages that register it. visibilitychange's 'hidden' state is the dependable signal that a save-before-leaving needs.",
    },
  ],
};
