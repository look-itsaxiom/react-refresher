# Context in React 19

Once a value genuinely needs to reach components at unknown depth, context is the right tool. React 19 changed enough of the API's edges that code written for React 18 habits now looks slightly dated.

## Creating and providing

`createContext` hasn't changed:

```tsx
type Theme = 'light' | 'dark';
const ThemeContext = createContext<Theme>('light');
```

The default value is only used when a component reads the context with no matching provider above it. For most app-level contexts (auth, theme, current user) that default is never actually seen in production and exists mainly so components render sensibly in tests and Storybook.

Providing a value changed. Since React 19, the context object itself is a valid JSX tag:

```tsx
// React 19+
function App() {
  const [theme, setTheme] = useState<Theme>('light');
  return (
    <ThemeContext value={theme}>
      <Page />
    </ThemeContext>
  );
}

// Still works, but is now the legacy form
<ThemeContext.Provider value={theme}>
  <Page />
</ThemeContext.Provider>
```

`.Provider` is not deprecated or scheduled for removal — plenty of code and libraries still use it, and you'll keep seeing it — but new code should render the context directly. It's one less nesting level and one less thing to import.

## Reading: `use` vs `useContext`

`useContext(ThemeContext)` still works and is still correct. React 19 adds `use(ThemeContext)`, which reads context (and, separately, promises — covered in the Suspense lesson) with one meaningful difference: `use` is not subject to the Rules of Hooks. You can call it inside a condition, a loop, or after an early return:

```tsx
function StatusDot({ show }: { show: boolean }) {
  if (!show) return null;
  const theme = use(ThemeContext); // fine: use() only runs when `show` is true
  return <span className={theme === 'dark' ? 'dot-light' : 'dot-dark'} />;
}
```

The same thing with `useContext` would violate the Rules of Hooks, because `useContext` (like every other hook) must run unconditionally on every render in the same order. This makes `use` genuinely more flexible for reading context that only matters in some branches — but reach for it because the branching is real, not as a default replacement for `useContext`. `use` cannot be called inside a `try`/`catch`, since it relies on throwing internally to integrate with Suspense and error boundaries; wrap the component in an error boundary instead.

## Splitting state from dispatch

A context that carries `{ value, setValue }` in one object forces every consumer to re-render whenever `value` changes, even a consumer that only ever calls `setValue` and never reads the current value (a "close" button, say). Splitting into two contexts fixes that:

```tsx
const CountContext = createContext(0);
const SetCountContext = createContext<(updater: (c: number) => number) => void>(() => {});

function CountProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  return (
    <CountContext value={count}>
      <SetCountContext value={setCount}>{children}</SetCountContext>
    </CountContext>
  );
}
```

A component that only calls `use(SetCountContext)` never re-renders when `count` changes, because it never subscribed to `CountContext` in the first place. This is the same instinct as `useReducer`'s `dispatch` being stable across renders, applied to context.

## Memoizing the provider value

Every context consumer re-renders whenever the value passed to the provider is a *new object*, whether or not the fields inside it actually changed:

```tsx
// ❌ new object every render of the provider, even if user/theme didn't change
<AppContext value={{ user, theme }}>

// ✅ same object reference until user or theme actually change
const value = useMemo(() => ({ user, theme }), [user, theme]);
<AppContext value={value}>
```

Without the `useMemo`, every consumer anywhere in the tree re-renders on every render of the provider — a well-known context performance trap, independent of anything about `use` vs `useContext`. The React Compiler, on by default for code it can safely analyze since the 19.x line, memoizes this automatically in most cases; you'll see `useMemo` disappear from Compiler-optimized codebases for exactly this pattern. It's still worth understanding by hand, both because not all code is compiled (library code shipped as a dependency typically isn't) and because "why did everything under my provider just re-render" is still a live debugging question.

## When context isn't enough

Context re-renders every consumer of a context on every value change; it has no concept of "only re-render if the part I read changed," and it isn't built for reading state outside of React (a WebSocket handler, a browser tab syncing state via `storage` events). High-frequency updates, deeply nested selective subscriptions, or state that needs to be read outside a component tree are where people reach for an external store — `useSyncExternalStore` under the hood, which is what libraries like Zustand build on. That's the next lesson.

## Interview angle

A multiplayer PM tool has exactly the kind of state this lesson is warning about: the active program, the signed-in user's role, which task is selected, what a vendor is currently allowed to see. A strong answer starts with composition, not context: pass the task list down as `children` from a layout component instead of threading `program`, `task`, and `onAssign` through four layers of task board components that don't use them. Reach for context only once a value genuinely needs to reach components at depth you don't control, like "does the current user have edit rights on this program" read by buttons scattered across the tree. Then name the cost: a provider value recreated on every render re-renders every consumer, so a `ProgramContext` needs a memoized value, and a context that mixes fast-changing state (the selected task) with slow-changing state (the program's vendor list) should be split into two contexts so selecting a task doesn't re-render every panel that only reads the vendor list.

**Likely follow-up:** A task board has a context feeding a sidebar, a Gantt chart, and a comments panel, and only the sidebar needs the "current selection." How do you stop the other two from re-rendering on every click?

**Pitfall:** Reaching for context as the default sharing mechanism instead of composition, then "fixing" the resulting re-render storm with `React.memo` on every consumer instead of splitting the context or moving the fast-changing piece into local state.

## Further reading (optional)

- [Passing Data Deeply with Context](https://react.dev/learn/passing-data-deeply-with-context) — react.dev
- [createContext reference](https://react.dev/reference/react/createContext) — react.dev, "Rendering a context as a provider"
- [use reference](https://react.dev/reference/react/use) — react.dev
- [Scaling Up with Reducer and Context](https://react.dev/learn/scaling-up-with-reducer-and-context) — react.dev
