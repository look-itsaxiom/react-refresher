# A hook is a function that calls hooks

There is no magic category called "hook" that React registers somewhere. A custom hook is a
plain JavaScript function, named `useSomething`, that calls other hooks. That's the entire
definition. `useLocalStorage`, `useResource`, `useOnlineStatus` — each is just a function body
containing calls to `useState`, `useEffect`, `useContext`, or other custom hooks, with the
component's logic factored out from around it.

You already do this kind of extraction with ordinary functions. Custom hooks are the same move,
but for logic that needs component-only primitives: state that survives across renders, effects
tied to the commit lifecycle, or context. A function that only computes a value from its
arguments doesn't need to be a hook — write `formatCurrency(cents)`, not `useFormatCurrency(cents)`.
Reach for a hook when the logic needs `useState`, `useEffect`, `useRef`, `useContext`, or another
hook internally.

## Why the rules of hooks exist

```tsx
function Profile({ userId }: { userId: number }) {
  const [name, setName] = useState('');
  if (userId === 0) {
    const [guest, setGuest] = useState(true); // ❌ conditional hook call
  }
  useEffect(() => { /* ... */ });
  // ...
}
```

React doesn't know your variable names. Internally, each component instance holds a linked list
of "hook state" cells, and every hook call reads or writes the next cell in that list, purely by
call order — first `useState` call gets cell 0, the next hook call gets cell 1, and so on, render
after render. There's no key, no name, just position. That's why the rules of hooks are not a
style preference:

1. **Only call hooks at the top level.** Never inside conditions, loops, or nested functions.
   If a hook call is skipped on one render and present on the next, every cell after it shifts,
   and React attaches the wrong state to the wrong `useState` call.
2. **Only call hooks from React function components or other hooks.** Not from event handlers,
   not from regular helper functions, not from class components.

A custom hook is exempt from neither rule — it's just where the second rule points. `useResource`
calling `useEffect` conditionally breaks in exactly the way a component doing the same thing
breaks.

`eslint-plugin-react-hooks` (now on major version 7, bundled with the `react-hooks/recommended`
config alongside the React Compiler's own lints) still enforces `rules-of-hooks` and
`exhaustive-deps` at compile time — catching the conditional call above and warning when an
effect uses a value it didn't list as a dependency. With the Compiler enabled, the same plugin
also flags patterns the Compiler can't safely memoize: mutating a value after it's been read
during render, or relying on identity for something the Compiler is free to recreate. Treat
compiler lint errors as correctness bugs, not style nits — they mean the optimizer bailed out
silently or your assumption about stability is wrong.

## Hooks are per call site, not shared state

Two components that both call `useOnlineStatus()` get two independent subscriptions and two
independent pieces of state. Calling a hook doesn't reach into some global store; it allocates a
new slot in *that component instance's* hook list. This is easy to forget if you're used to
singletons or module-level caches: `useState(0)` inside a custom hook gives every caller its own
counter, not a shared one. If you want genuinely shared state, the hook needs to read from
something outside itself — a module-level store, `useSyncExternalStore` against a shared source,
or context — the hook is just the plumbing that connects a component to that source.

## Designing the return value

Two conventions dominate:

```tsx
// Tuple: for a small, fixed, order-matters pair — mirrors useState itself.
const [value, setValue] = useToggle(false);

// Object: for three or more values, or when call sites only need some of them.
const { data, loading, error } = useResource(loadUser);
```

Tuples read well when there are exactly two things and the order is obvious (a value and its
setter). Once you're returning three or more things, or expect callers to skip fields, prefer a
named object — `const { loading } = useResource(...)` is clearer than `const [, loading] =
useResource(...)`. Naming is also part of the API: a hook called `useResource` should behave
like a noun (something you get), while `useSubscribe` or `useLogEvent` should feel like a verb
(something that happens as a side effect). The name is the first thing a reader uses to guess
what's safe to ignore about the return value.

## Further reading (optional)

- [Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks) — react.dev
- [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks) — react.dev
- [`eslint-plugin-react-hooks`](https://react.dev/reference/eslint-plugin-react-hooks) — react.dev
- [`exhaustive-deps` lint rule](https://react.dev/reference/eslint-plugin-react-hooks/lints/exhaustive-deps) — react.dev
