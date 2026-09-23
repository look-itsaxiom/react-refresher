# Migration playbook

A React 19 upgrade on a small app is one PR. On a large codebase with dozens of packages,
doing it in one PR is how a silent removal (see the previous step) reaches production
unnoticed. The sequence below turns "upgrade React" into a series of small, individually
reviewable, individually revertible steps.

## Step 0: land on React 18.3 first

React 18.3.0 is a bridge release: it changes no behavior, but it adds console warnings for
every API this lesson covers — `defaultProps`, `propTypes`, string refs, legacy context,
`ReactDOM.render`, `findDOMNode`, module pattern factories, the works. Everything that would
otherwise fail silently in 19 gets a warning in 18.3, while your app still runs on 18's
semantics. Upgrade to 18.3, run your app and your test suite, and work through the console
output. This turns every silent removal into a loud one, on a version where you still have
time to fix it without a version bump forcing your hand.

## Step 1: run the codemods

React ships codemods for the mechanical parts of the migration:

```bash
npx codemod@latest react/19/migration-recipe
```

This bundles five transforms and lets you review each one's diff:

- `replace-reactdom-render` — `ReactDOM.render`/`hydrate`/`unmountComponentAtNode` → `createRoot`/`hydrateRoot`/`root.unmount()`.
- `replace-string-ref` — string refs → callback refs.
- `replace-act-import` — `react-dom/test-utils`'s `act` → `import { act } from 'react'`.
- `replace-use-form-state` — the renamed `useActionState` hook (was `useFormState` in early 19 canaries).
- `prop-types-typescript` — converts a `propTypes` shape into a matching TypeScript interface.

None of them touch legacy context or module pattern factories — those have no mechanical
rewrite (the target shape depends too much on how you're already structuring the component)
and stay a manual pass. Budget time for them separately; don't assume the codemod recipe
caught everything just because it ran clean.

## Step 2: run the type codemods

`@types/react@19` changed several types independent of any runtime behavior, so this pass is
purely about getting `tsc` green, not fixing bugs:

```bash
npx types-react-codemod@latest preset-19 ./src
```

The two changes worth knowing by name:

- **`useRef` now requires an argument.** `useRef<HTMLDivElement>()` used to compile with an
  implicit `undefined`; the codemod rewrites it to `useRef<HTMLDivElement>(undefined)` (or
  `useRef<HTMLDivElement | null>(null)` if you were relying on `.current` starting `null`).
  This one is worth understanding rather than blindly accepting: `useRef(undefined)` and
  `useRef(null)` produce a ref whose `.current` starts at different values, and only one of
  them matches what the rest of the component expects.
- **The global `JSX` namespace is now scoped to `React.JSX`.** Code that referenced
  `JSX.Element` as a global needs `React.JSX.Element` (or an explicit
  `import type { JSX } from 'react'`). Library type definitions are the most common place
  this shows up — application code rarely names `JSX.Element` directly.

A smaller one to watch for by hand, since no codemod flags it: a ref callback can now return
a cleanup function, the same way an effect does. `@types/react` types this in, so a ref
callback with an implicit-return arrow function —
`ref={(node) => (instanceRef.current = node)}` — has its assignment's result value read as
an attempted cleanup function, which can produce a confusing type error where none existed
before. Wrap the body in braces to make the callback return `void` on purpose:
`ref={(node) => { instanceRef.current = node; }}`.

## Step 3: the manual pass

Legacy context and module pattern factories need a human, one component at a time:

- Legacy context → `createContext`/`useContext`, or `static contextType` if the consumer has
  to stay a class. There's no shortcut here because the shape of "what context key maps to
  what value" is exactly the design decision a codemod can't make for you.
- Module pattern factories → an ordinary function component. If you find one, it's likely old
  enough that the whole component is worth a second look anyway.

## Step 4: wire up error reporting, then bump the version

Before flipping the version, add `onUncaughtError`/`onCaughtError` to your root if anything
in your error-monitoring setup depended on render errors reaching `window.onerror` (see the
previous step for why that path changed). Then bump `react` and `react-dom` to 19.3, run the
full test suite, and watch specifically for tests that were asserting on the old
double-thrown-error behavior — those need to move to whichever of the two new callbacks
matches the case they're testing.

## Sequencing it as PRs

For a codebase with more than a handful of contributors, four separate PRs beat one giant
one: (1) the 18.3 bridge upgrade with warnings fixed, changing no runtime behavior and easy
to review; (2) the codemod recipe's mechanical diff; (3) the manual legacy-context and
module-factory conversions, reviewed by whoever owns that code; (4) the version bump itself,
which by this point should be nearly a no-op. Each PR is independently revertible, and a
regression bisects to one of four causes instead of one enormous diff.

## Further reading (optional)

- [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide) — react.dev
- [`types-react-codemod`](https://github.com/eps1lon/types-react-codemod) — GitHub
- [`useRef` reference](https://react.dev/reference/react/useRef) — react.dev
- [`createContext` reference](https://react.dev/reference/react/createContext) — react.dev
