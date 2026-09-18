# What hydration is, and how it fails

The sibling lesson on rendering strategies built the two halves of the pipeline:
`renderToString` on the server produces markup, and `hydrateRoot` on the client
attaches React to that markup instead of throwing it away and rendering from
scratch. This step is about the contract hydration makes — and the ways real
apps break it.

## The deal hydration makes

`hydrateRoot(container, <App />)` does not render `<App />` into an empty
container. It walks the existing DOM inside `container` and the React tree in
parallel, node by node, and tries to **reuse** what's already there: attach
event listeners, wire up fibers, and skip re-creating elements. This is why
hydration is fast — it's attaching, not building.

The deal is: the first client render of `<App />` must produce the same tree
shape and (mostly) the same text as what the server already sent down. If it
doesn't, React has to decide what to trust — the DOM that's already visible,
or the tree it just computed — and that's where things get interesting.

## What actually goes wrong

A short list of the recurring causes, because they're almost always one of
these five:

1. **Time.** `new Date().toLocaleTimeString()` rendered directly. The
   server's clock and the browser's clock are never the same millisecond, so
   the text differs every single time.
2. **Randomness.** `Math.random()`-based ids, `crypto.randomUUID()` calls
   made during render, array shuffles. Different value every render, whether
   that render happens on the server or the client.
3. **Locale and timezone.** `toLocaleDateString()` without a fixed locale, or
   date math that depends on the server's timezone (usually UTC) versus the
   visitor's. Same input, different formatted string.
4. **Browser-only globals read during render.** `window`, `document`,
   `localStorage`, `navigator.userAgent`, media queries. On a real server
   these don't exist at all — `window` throws a `ReferenceError` the moment
   you reference it in `renderToString`. If you guard it (`typeof window !==
   'undefined'`) so it doesn't crash, you've usually just swapped a crash for
   a hydration mismatch, because the guarded branch renders one thing on the
   server and a different thing on the client.
5. **Auth and personalization state that isn't in the markup.** The server
   renders "Sign in", the client immediately knows the visitor is logged in
   from a cookie or `localStorage` token, and renders "Welcome back" — same
   component, same render pass, different output, because the two
   environments don't have the same information yet.

Browser extensions that inject DOM nodes before React attaches (password
manager icons, dark-mode overlays, translation widgets) look like a sixth
category from the outside, but they're not *your* mismatch — see below.

## What React 19 actually does about it

This is where React 19 changed real behavior, not just messaging:

- **Text and attribute mismatches are not treated the same.** A mismatched
  *text node* is not patched in place — React discards that subtree's DOM,
  throws away the server-rendered nodes for it, and renders it fresh on the
  client. This is "the tree will be regenerated on the client," and it's
  exactly what makes hydration mismatches expensive: you paid for server
  rendering and then threw part of it away. A mismatched **attribute**
  (an `id`, a `class`, a `style` value) is different and easy to miss: React
  logs a warning to the console and does **not** patch it and does **not**
  discard the node. The server's attribute value simply stays on the page,
  silently wrong, with no error surfaced to your error reporting. If you're
  computing an `id` with `Math.random()` on both sides, the one from the
  server wins forever, and nothing in your monitoring will tell you that.
- **`onRecoverableError`.** `hydrateRoot(container, <App/>, { onRecoverableError
  })` is your hook into text-content mismatches (and a few other cases React
  can recover from, like an error thrown during the initial commit). React
  calls it once per boundary that had to be regenerated, with an `error` and
  an `errorInfo` object carrying a component stack. Wire this to your error
  reporting in production — it's the only signal you get that hydration
  silently degraded to a client render for part of the page. Don't assert on
  the exact message text in tests; it has react.dev links and phrasing baked
  in that can change between patch releases. Count calls instead.
- **Diffs that are actually readable.** React 19's hydration warnings print a
  real diff — the DOM tree with `+`/`-` markers on the line that disagreed —
  instead of the old "text content did not match" message with no context.
  Worth reading the console output once instead of skimming past it.
- **Third-party DOM in `<head>`/`<body>` is tolerated where it used to
  warn.** A password manager or translation extension that injects extra
  `<style>`, `<meta>`, or wrapper tags directly into `<head>` or `<body>` no
  longer triggers a hydration mismatch in React 19 — React skips over tags it
  didn't render there instead of complaining about them. If React still has
  to discard and regenerate a subtree because of an unrelated mismatch, it
  now preserves stylesheets that third-party code inserted rather than
  wiping them out. This is specifically about the document shell; an extra
  node injected in the middle of a component's own children still mismatches
  the same as before.

## `suppressHydrationWarning`, and why it's a scalpel, not a fix

`<time suppressHydrationWarning>{new Date().toLocaleTimeString()}</time>`
tells React "I know this one text node's content can legitimately differ; use
the server's value on the first paint and don't warn." It only suppresses the
warning for that node's direct text/attribute — it does not extend to
children, and it does not make the mismatch not happen. The DOM still shows
the server's stale time until the next real update. It's the right tool for
"this value is allowed to be stale for one paint" (a timestamp, a relative
"3 minutes ago" string you'll correct in an effect). It is the wrong tool for
"I have three unrelated mismatches and I want the warnings to stop" — that's
hiding a real bug, not fixing one.

## The actual fix for most of these: don't guess, ask twice

The reliable pattern for "this value depends on the client environment" is
not to read it during the render that has to match the server. It's to
render a value the server can vouch for on the first pass, then correct it
once the client knows better:

- **Defer to an effect.** Render a placeholder (or the server's best guess)
  during the render that must match, then compute the real value in
  `useEffect` and `setState`. The mismatch never happens because the first
  client render *is* the server's value; the correction is an ordinary
  client-only update afterward.
- **`useSyncExternalStore` with a `getServerSnapshot`.** For anything backed
  by a real external source — viewport width, `matchMedia`, `localStorage`,
  a WebSocket-fed store — `useSyncExternalStore(subscribe, getSnapshot,
  getServerSnapshot)` is the version of "defer to an effect" that also keeps
  you subscribed. `getServerSnapshot` supplies the value used both when
  actually rendering on the server and during the client's first hydration
  pass, so the two agree by construction. Once hydration commits, React
  compares that snapshot to the real client-side `getSnapshot()`; if they
  differ, it schedules a passive-effect update to the correct value
  automatically — no manual "hydrated yet?" state needed. Omit
  `getServerSnapshot` and calling the hook during SSR throws.
- **`useId` instead of `Math.random()`.** `useId()` derives an id from the
  component's position in the tree, which is identical on the server and the
  client for the same tree shape. It is not a random value generator — don't
  reach for it for keys or anything you want to actually vary.

## Further reading

- [react.dev — Hydrating Server-Rendered HTML](https://react.dev/reference/react-dom/client/hydrateRoot)
- [react.dev — `useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore)
- [react.dev — `suppressHydrationWarning`](https://react.dev/reference/react-dom/client/hydrateRoot#suppressing-unavoidable-hydration-mismatch-errors)
- [react.dev — `useId`](https://react.dev/reference/react/useId)
- [react.dev — React 19 release notes (hydration and error reporting section)](https://react.dev/blog/2024/12/05/react-19)
