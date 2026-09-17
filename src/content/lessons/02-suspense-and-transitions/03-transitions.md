# Transitions: urgent vs. non-urgent updates

Concurrent rendering (React 18) lets React work on a render in the background and keep the current screen interactive. **Transitions** are how you tell React which updates may be treated that way.

## The problem

Click a tab, and the new tab's content suspends while its data loads. Without transitions, React does the only thing it can: hide the content under the nearest Suspense boundary and show the fallback. The user sees the tab bar (or the whole page) get replaced by a spinner for a moment. Type in a search box that filters a big list, and every keystroke waits for the list to re-render before the input updates.

## `startTransition` and `useTransition`

Wrap a state update in `startTransition` and React treats it as non-urgent:

```tsx
import { useTransition } from 'react';

const [isPending, startTransition] = useTransition();

function selectTab(next: Tab) {
  startTransition(() => setTab(next));
}
```

Three things change:

1. **Already-visible content stays on screen.** If the new render suspends, React keeps showing the old UI instead of the fallback, until the data is ready. (Fallbacks still show for content that was never visible, like on first load.)
2. **Urgent updates interrupt it.** If the user types or clicks again, React abandons the in-progress transition and starts over with the latest state.
3. **`isPending` is `true` while the transition renders**, so you can dim the old content or show a small indicator without hiding anything.

`startTransition` is also exported from `react` directly (no hook) for use outside components. In React 19 the function you pass may be `async`; that is what makes **Actions** work, which the next lesson covers.

## `useDeferredValue`

Sometimes you do not control the state update (it comes from a parent) but you do control an expensive consumer. `useDeferredValue` gives you a lagging copy of a value that React updates in a transition:

```tsx
const deferredQuery = useDeferredValue(query);
const isStale = query !== deferredQuery;
return <SlowList query={deferredQuery} style={{ opacity: isStale ? 0.6 : 1 }} />;
```

The input (`query`) updates immediately; the list catches up when React has time.

## When not to use a transition

Anything the user must see immediately (the text they typed, a toggled checkbox) is urgent; keep it a normal update. Transitions are for the *consequences* of that input: filtering, navigating, loading.

In the exercise, a tab switch suspends. Make it a transition so the current tab stays visible with a pending indicator.
