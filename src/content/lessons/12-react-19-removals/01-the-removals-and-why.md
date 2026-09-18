# What React 19 removed, and why some of it hurts more than others

React 18 spent years accumulating APIs that had a better replacement long before they were
finally deleted: `propTypes` outlived its usefulness once TypeScript became the default way
to type props; string refs were deprecated in 2018 and kept working anyway; legacy context
predates `createContext` by three years. React 19 (shipped December 2024; you're on 19.3)
is the release that actually removes them. The interesting part isn't the list — it's that
these removals fail in two very different ways, and knowing which is which changes how you
find them.

**Loud removals** throw or refuse to compile, so a broken build or a red error screen tells
you immediately. **Silent removals** compile fine, run fine, and just quietly stop doing
what they used to do — the only symptom is a UI that's subtly wrong. The silent ones are the
ones that survive code review.

## Removed outright

- **`propTypes` and `defaultProps` on function components.** Both are read by nothing in
  React 19 — the fields are still there if you set them, but no runtime code ever looks at
  `SomeComponent.propTypes` or `SomeComponent.defaultProps` again. This is a **silent**
  removal: no warning, no error, the prop is simply `undefined` when the caller omits it.
  Replace `defaultProps` with ES6 default parameters (`function Heading({ text = 'Hello' })`)
  and `propTypes` with TypeScript types. (Class components keep `defaultProps` — this is a
  function-component-only removal.)
- **String refs** (`<input ref="username" />`). This one is **loud**: React 19 throws
  "String refs are no longer supported" at the point of render. Replace with a ref callback
  or `useRef`.
- **Legacy context** (`static contextTypes`, `static childContextTypes`, `getChildContext`).
  **Silent** — nothing calls `getChildContext` anymore, so a consumer's `this.context` is
  just an empty object, forever. Replace with `createContext`/`useContext`, or
  `static contextType` on a class that still needs to be a class.
- **Module pattern factories** — a component defined as a factory function that returns a
  plain object of methods instead of a class or function component. **Loud**: React doesn't
  recognize the shape and throws when asked to render it.
- **`React.createFactory`.** Loud — the export is gone; call sites throw `is not a function`.
- **`ReactDOM.render`, `ReactDOM.hydrate`, `ReactDOM.unmountComponentAtNode`, `ReactDOM.findDOMNode`.**
  Loud. Each one is replaced with the `createRoot`/`hydrateRoot` API introduced in React 18:
  `createRoot(container).render(<App />)`, `root.unmount()`, and a DOM ref in place of
  `findDOMNode`.
- **`react-dom/test-utils`.** Loud — the module is gone. `act` moved to the `react` package
  itself (`import { act } from 'react'`), so it's no longer tied to `react-dom` at all.
- **`react-test-renderer/shallow`.** Loud — install `react-shallow-renderer` directly if you
  still need shallow rendering (most teams don't; Testing Library doesn't do shallow
  rendering on purpose).
- **UMD builds.** If you were loading React from a `<script>` tag pointing at a UMD bundle,
  that build no longer ships. Use an ESM-based CDN (esm.sh, for example) instead.
- A handful of `unstable_*` escape hatches (`unstable_flushControlled`,
  `unstable_createEventHandle`, `unstable_renderSubtreeIntoContainer`,
  `unstable_runWithPriority`) and some dead exports from `react-is`. These only ever
  appeared in framework internals, not application code.

## Deprecated, not removed

- **`react-test-renderer`** (the full renderer, not just `/shallow`) is deprecated, not gone.
  React's own docs point you at `@testing-library/react` /
  `@testing-library/react-native` instead — a snapshot of React's internal tree was always a
  worse test than one that asserts on what a user sees.
- **`forwardRef`.** Still works, still no removal date as of 19.3. React 19 makes `ref` an
  ordinary prop on function components (`function TextField({ ref }: Props)`), which is what
  `forwardRef` existed to work around, so React's docs call it unnecessary for new code and
  say it will be deprecated "in a future release." Existing `forwardRef` components keep
  compiling and running exactly as before — there's no warning yet, so it won't show up in
  the loud/silent split above. Treat it as "stop writing it," not "go fix it."

## The behavior change that isn't a removal, but reads like one

Before 19, an error thrown during render was re-thrown twice by React (once caught by an
error boundary, once bubbled to `window.onerror`/your test runner) — noisy, but reliable if
you had global error monitoring hooked to `window.onerror`. In 19, React stops re-throwing:
an uncaught render error goes to `window.reportError`, and one caught by an error boundary
goes to `console.error`, once each. If your monitoring specifically listened for the old
double-throw, it goes quiet — not because your code broke, but because the reporting path
moved. Pass `onUncaughtError` and `onCaughtError` to `createRoot`/`hydrateRoot` to hook into
the new path directly instead of relying on global handlers.

```tsx
createRoot(container, {
  onUncaughtError: (error, errorInfo) => reportToSentry(error, errorInfo),
  onCaughtError: (error, errorInfo) => reportToSentry(error, errorInfo),
}).render(<App />);
```

## Why this matters more than a changelog

Every silent removal above shares a shape: the code still runs, the types often still check,
and the only evidence is a UI that's wrong in some case you didn't happen to click through in
manual testing. That's exactly what the exercises in this lesson are built to catch — a
`defaultProps` value that never applies, and a context value that never arrives — because
"it still compiles" is not the bar for a React 19 upgrade being safe.

## Further reading

- [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide) — react.dev
- [React v19](https://react.dev/blog/2024/12/05/react-19) — react.dev
- [`forwardRef` reference](https://react.dev/reference/react/forwardRef) — react.dev
- [`createRoot` reference](https://react.dev/reference/react-dom/client/createRoot) — react.dev
