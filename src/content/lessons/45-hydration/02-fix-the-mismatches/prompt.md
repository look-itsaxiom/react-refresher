# Fix the mismatches

`Dashboard` has three hydration bugs, each a classic:

1. It reads `new Date().toLocaleTimeString()` during render, so the server's
   timestamp and the client's first render never agree.
2. It builds its panel `id` with `Math.random()`, so the server's id and the
   client's id are different strings — silently, since attribute mismatches
   aren't patched or reported.
3. It reads `window.innerWidth` during render to decide between `'wide'` and
   `'narrow'`, so whatever the server assumed can disagree with the real
   client viewport.

The file exports two helpers that stand in for a real server/browser split:

- `serverHtml()` — calls `renderToString(<Dashboard />)`, playing the role of
  your server.
- `hydrateInto(container, onRecoverableError?)` — calls `hydrateRoot` on
  markup already sitting in `container`, playing the role of the browser
  attaching to what the server sent.

Fix each bug with the matching tool, without changing what `serverHtml()` or
`hydrateInto()` do or removing either export:

- **Time**: don't read the clock during the render that has to match the
  server. Show a placeholder (or nothing) on the first render, and set the
  real time from a `useEffect` after mount.
- **Id**: replace `Math.random()` with `useId()`.
- **Viewport**: replace the direct `window.innerWidth` read with
  `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)`, where
  `getServerSnapshot` returns a fixed assumption (pick one — desktop-first is
  the usual default), `getSnapshot` reads the real `window.innerWidth`, and
  `subscribe` listens for the `resize` event.

When you're done, hydrating the server's markup should produce zero calls to
`onRecoverableError`, reuse the server's DOM nodes instead of replacing them,
and still correct itself to the real viewport width once the client takes
over.
