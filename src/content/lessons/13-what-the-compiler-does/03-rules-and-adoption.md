# The rules it relies on, and how to adopt it

The compiler's whole premise is that it can prove a piece of code is safe to skip re-running. That proof only holds if the code follows the **Rules of React** — the same rules that make concurrent rendering and `<StrictMode>` double-invocation safe, tightened into something a static analyzer can check. The rules aren't new; the compiler just makes violating them cost more than it used to.

## The rules that matter for compilation

- **Components and hooks must be pure during render.** Same props/state in, same JSX out, no side effects. `Math.random()`, `Date.now()`, or reading `document` in the render body are all violations.
- **Don't mutate props, state, or anything you didn't create this render.** `products.sort()` mutates the caller's array in place; `[...products].sort()` doesn't. The compiler treats an object as a dependency only if it doesn't change identity, so a function that quietly mutates its input can make the compiler cache a stale value and hand it back later.
- **Hooks run unconditionally, in the same order, every render** — no hooks inside `if`, loops, or after an early `return`. This is the existing Rules of Hooks, not new.
- **Don't read a ref's `.current` during render.** Refs are the one piece of component state React explicitly excuses from purity — mutate them freely in effects and event handlers — precisely because they're meant to be invisible to rendering. Reading `ref.current` while computing JSX or a derived value means the same render can produce two different outputs depending on timing, which breaks the compiler's memoization the same way it breaks concurrent rendering.

None of this is compiler-specific ceremony. It's the contract components already needed to honor for `<StrictMode>`'s double-invocation and for concurrent rendering's restart-and-discard behavior (see the previous lesson on concurrent rendering). The compiler is a second, stricter consumer of a contract you were already supposed to be keeping.

## Catching violations before they ship

`eslint-plugin-react-hooks` v7 ships the compiler's static analysis as lint rules, on by default in the `recommended` and `recommended-latest` presets. It flags, among others: `purity` (side effects during render), `immutability` (mutating props/state), `set-state-in-render` and `set-state-in-effect` (patterns that cause render loops), `refs` (reading `.current` during render), and `static-components` (components defined inside other components, which breaks identity-based memoization). Running this linter is the first thing to do before turning the compiler on in an existing codebase — it finds violations without needing a build.

For a one-shot compatibility check across a whole codebase, run:

```bash
npx react-compiler-healthcheck@latest
```

It reports how many components are compilable, checks whether `<StrictMode>` is in use (a good proxy for how rule-clean the codebase already is), and flags known-incompatible libraries in your dependency tree.

## Incremental adoption

Nobody has to flip the compiler on for an entire app at once. Two knobs control the rollout:

1. **`compilationMode: 'annotation'`.** Instead of compiling everything and skipping violations, this mode compiles *nothing* except functions and hooks that start with the `"use memo"` directive. You opt components in one at a time as you review them, which is slower but gives you an explicit, greppable list of what's been vetted.
2. **Directory scoping**, via Babel's `overrides`: point the compiler plugin at specific globs (`./src/modern/**/*.tsx`) and leave the rest of the codebase untouched. This is the more common path for large codebases — compile new code and reviewed directories, leave legacy code alone until it's touched.

Either way, `"use no memo"` remains available as a per-function bailout if one specific component misbehaves after compilation and you need to isolate it while debugging, without turning the compiler off elsewhere.

## How it's wired up in this project, and elsewhere

This project's `vite.config.ts` enables the compiler through `@vitejs/plugin-react`'s `compiler: true` option, which — as of the version pinned here — delegates to `oxc-transform-react`, a Rust-based transform, rather than the Babel plugin. That's faster in dev, at the cost of being a newer, less battle-tested path than Babel; the React team's own reference setup for Vite still documents the Babel route, `babel-plugin-react-compiler` added as a preset via `@rolldown/plugin-babel`, as the primary supported way to enable it. Next.js exposes it as a `reactCompiler` flag in `next.config.js`; Expo enables it by default from SDK 54 onward. Whichever path you use, the important thing to verify is the same: check for the `react/compiler-runtime` import in your build output, or the "Memo ✨" badge in React DevTools, to confirm compilation is actually happening rather than silently no-op'ing because of a misconfigured plugin order (the Babel plugin must run first in the plugin list).

## Measuring whether it's helping

Turn on the compiler and then *use the Profiler tab in React DevTools* to compare render counts and commit durations before and after, on the interactions you actually care about (typing in a filter box, scrolling a long list). The compiler's win is fewer wasted re-renders, not faster individual renders — a component that only ever rendered once anyway won't get faster. If a component doesn't show the "Memo ✨" badge after enabling the compiler, that's your signal to go find which Rule of React it's violating, usually with the healthcheck or lint rule that would have caught it first.

## Further reading (optional)

- [Rules of React — react.dev](https://react.dev/reference/rules)
- [React Compiler installation — react.dev](https://react.dev/learn/react-compiler/installation)
- [React Compiler incremental adoption — react.dev](https://react.dev/learn/react-compiler/incremental-adoption)
- [`eslint-plugin-react-hooks` — react.dev](https://react.dev/reference/eslint-plugin-react-hooks)
