# How React renders

Everything you write in React gets pulled through the same three-phase loop. Once this loop is in your head, most "why did that happen?" questions answer themselves.

## Trigger → render → commit

1. **Trigger.** Something asks for a render: the initial `createRoot(...).render()`, or a state setter call (`setCount(1)`), or a parent re-rendering.
2. **Render.** React calls your component function. The function returns JSX, which is a plain description of UI: `<button>` becomes `{ type: 'button', props: {...} }`. Nothing touches the DOM yet. Rendering must be **pure**: same props and state in, same JSX out, no side effects.
3. **Commit.** React diffs the new description against the previous one and applies only the minimal DOM changes. Then it runs your effects.

```tsx
function Counter() {
  const [count, setCount] = useState(0);        // read the snapshot for this render
  console.log('render with count =', count);     // runs during the render phase
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

The `console.log` runs every render. The DOM update happens once per commit. Those are different moments.

## State is a snapshot

`count` is not a live variable that React mutates. It is a **value captured when this render started**. Every closure created during that render (event handlers, timers, promises) sees that same value, forever.

```tsx
function handleClick() {
  setCount(count + 1);   // count is 0 in this render
  setCount(count + 1);   // still 0: this is the same snapshot
  setCount(count + 1);   // still 0
}
// After the click, count is 1, not 3.
```

React does not re-run your function mid-handler. It queues the updates and re-renders once after the handler returns. That is **batching**, and since React 18 it applies everywhere: inside promises, timeouts, and native event listeners too, not only inside React event handlers.

## Updater functions read the queue, not the snapshot

When the next value depends on the previous one, pass a function. React calls it with the latest queued value:

```tsx
setCount((c) => c + 1);
setCount((c) => c + 1);
setCount((c) => c + 1);
// 0 → 1 → 2 → 3 in one render
```

This also fixes the classic stale-closure bug:

```tsx
// ❌ captured `count` may be old by the time the timer fires
setTimeout(() => setCount(count + 1), 1000);

// ✅ reads whatever the value is at that moment
setTimeout(() => setCount((c) => c + 1), 1000);
```

Rule of thumb: **if the new state is computed from the old state, use an updater.** If it is a fresh value from the outside world (an input's text, a server response), pass the value.

## Why purity matters more than ever

React 18 introduced concurrent rendering: React may start rendering, pause, throw the work away, and restart. React 19's Compiler goes further and memoizes your components automatically. Both rely on the render phase being pure. Mutating an object you received as a prop, writing to a variable outside the component, or calling `Math.random()` during render all break that contract in ways that used to be merely ugly and are now actively wrong.

In the exercise you will fix a counter with two stale-snapshot bugs. Keep "snapshot vs queue" in mind.
