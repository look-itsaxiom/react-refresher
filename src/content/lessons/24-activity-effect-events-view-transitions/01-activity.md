# `<Activity>`: hidden but alive

Every React app has UI that needs to disappear without dying: an inactive tab, the page you just navigated away from, a route you're likely to visit next. Until React 19.2, you had exactly two tools for that, and both were wrong in a different way.

Unmounting (`{tab === 'notes' && <NotesPanel />}`) throws away state and DOM. Switch tabs and back, and a half-typed draft, a scroll position, an uncollapsed accordion — all gone, because the component instance never existed on the other side of the switch. Keeping everything mounted and toggling `display: none` yourself keeps the state, but every hidden tree still renders on every update, still runs its effects, still subscribes to stores and reflows the DOM for work nobody can see.

`<Activity>` is a stable primitive (since React 19.2) for the state in between: **mounted, invisible, and not doing work**.

```tsx
import { Activity, useState } from 'react';

function Tabs() {
  const [tab, setTab] = useState<'notes' | 'tasks'>('notes');
  return (
    <>
      <TabButtons tab={tab} onChange={setTab} />
      <Activity mode={tab === 'notes' ? 'visible' : 'hidden'}>
        <NotesPanel />
      </Activity>
      <Activity mode={tab === 'tasks' ? 'visible' : 'hidden'}>
        <TasksPanel />
      </Activity>
    </>
  );
}
```

Both panels are always in the tree. React never remounts either one as `tab` changes, so `NotesPanel`'s `useState` draft survives being switched away from and back — the same guarantee you'd normally only get from state lifted to a parent, without having to lift it.

## What "hidden" actually does

`mode="hidden"` is not a styling prop, and it is not `display: none` you'd write yourself, even though that's the mechanism it happens to use in the DOM. Three things change at once:

- **The subtree stays mounted.** Component instances, their `useState` and `useReducer` state, and the DOM nodes React already created are all preserved.
- **Effects unmount.** Every `useEffect` (and `useLayoutEffect`) cleanup in the hidden subtree runs, and the effects do not run again until the subtree becomes visible. A hidden chat panel is not holding a live WebSocket open; a hidden chart is not still listening to a `ResizeObserver`. This is the detail that makes `<Activity>` safe to use liberally — hidden trees cost DOM memory, not CPU or network.
- **Updates skip it.** State changes elsewhere in the app don't bother re-rendering a hidden `<Activity>` subtree. If something *inside* the hidden tree changes its own state, React does eventually apply that update, but at a very low priority, well after everything visible has painted.

That combination — DOM and state preserved, effects torn down, updates deferred — is why the docs describe it as "unmounting a component without destroying its state." It sits deliberately between a full mount and a full unmount, and matches how a browser tab you've switched away from behaves: still there, not currently costing you anything, ready to resume instantly.

## Where this replaces existing patterns

- **Tabs and accordions.** The example above is the canonical case: keep every panel mounted, let `<Activity>` decide which one is doing work.
- **Back/forward navigation.** A router can keep the previous screen alive in a hidden `<Activity>` while the next one mounts, so pressing back restores scroll position and form state instantly instead of re-fetching and re-rendering from scratch.
- **Pre-rendering likely-next content.** Mount a route the user hasn't navigated to yet inside `mode="hidden"`, and its data fetching and initial render happen at low priority in the background. When the user does navigate there, React just flips it to `visible` instead of starting from nothing. This is speculative pre-rendering, not eager pre-rendering: it happens opportunistically, not in a guaranteed timeframe.

## What it is not

`<Activity>` is not a visibility utility for content you want the user to never come back to — for that, unmounting is still correct and cheaper (no preserved state to hold onto). It's also not a replacement for `display: none` applied to genuinely static markup with no component state worth preserving; reach for it specifically when the cost of losing state or the cost of re-fetching on remount is the problem you're solving.

The `name` prop is optional and purely for DevTools/instrumentation — it doesn't change behavior. There's no third mode: `mode` is exactly `"visible" | "hidden"`.

## Further reading

- [`<Activity>` reference](https://react.dev/reference/react/Activity)
- [react.dev blog (release notes index)](https://react.dev/blog)
- [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
