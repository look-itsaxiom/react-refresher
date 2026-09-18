import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A custom hook subscribes to a WebSocket with `useState` set from the initial value and `useEffect` registering the listener. What is the actual bug, independent of concurrent rendering?',
      choices: [
        { id: 'a', text: 'None — this pattern is equivalent to useSyncExternalStore as long as the effect has the right dependency array.' },
        {
          id: 'b',
          text: 'A message the socket delivers in the gap between the initial render and the effect subscribing is dropped permanently: no listener existed yet, and nothing rechecks the value afterward.',
        },
        { id: 'c', text: 'The component will throw a hydration error on every render, even outside of SSR.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'useState captures a value during render; useEffect subscribes afterward. Anything the store does in that window has no listener to notify and no later recheck to catch it, so the update is lost, not delayed.',
    },
    {
      id: 'q2',
      prompt: 'What does React do with the return value of `subscribe(onStoreChange)` in `useSyncExternalStore`, and what does `onStoreChange` mean when the store calls it?',
      choices: [
        { id: 'a', text: 'The return value is the new state; onStoreChange() means "re-render immediately with this state."' },
        {
          id: 'b',
          text: 'The return value must be an unsubscribe function; calling onStoreChange() only means "something changed, call getSnapshot again" — it never carries the new value itself.',
        },
        { id: 'c', text: 'subscribe is called once at module load, and onStoreChange is only invoked during server rendering.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'getSnapshot is the single source of truth for the current value. onStoreChange is just a signal to re-check it, which is also why React can safely call getSnapshot again right after subscribing to catch a value that already changed.',
    },
    {
      id: 'q3',
      prompt: 'A `getSnapshot` implementation does `() => ({ items: store.getItems() })`, recreating the wrapper object on every call. What happens?',
      choices: [
        { id: 'a', text: 'Nothing — React only compares the items array inside, not the wrapper object.' },
        {
          id: 'b',
          text: 'React re-renders, calls getSnapshot again to confirm, gets another new object that fails Object.is against the last one, and concludes the store is still changing — often an infinite render loop or a "getSnapshot should be cached" warning.',
        },
        { id: 'c', text: 'React automatically deep-compares the returned object and skips the extra render.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'useSyncExternalStore compares snapshots with Object.is. A getSnapshot that allocates a new object every call can never be equal to its previous result, even when nothing meaningful changed, which is exactly the shape of an infinite-loop bug.',
    },
    {
      id: 'q4',
      prompt: 'Two sibling components both call `useStore(selector)` against the same store, with different selectors, one reading `state.count` and the other reading `state.label`. Updating only `count` should ideally...',
      choices: [
        { id: 'a', text: 'Re-render both components, since both are subscribed to the same underlying store object.' },
        {
          id: 'b',
          text: 'Only re-render the component selecting count, as long as the label-selector\'s getSnapshot keeps returning a referentially stable value when label has not changed.',
        },
        { id: 'c', text: 'Never re-render either component, since useSyncExternalStore batches all updates until the next user event.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Subscribing to the same store is not the same as reading the same slice. A selector that returns an unchanged, Object.is-stable value for the label lets React bail out of re-rendering that consumer, which is the whole point of selecting a narrow slice.",
    },
    {
      id: 'q5',
      prompt: 'A form renders the same `FieldGroup` component three times on one page. Why is `id="field"` inside that component wrong, and why is `Math.random()` inside it also wrong?',
      choices: [
        {
          id: 'a',
          text: 'A hardcoded id collides across the three instances; Math.random() avoids collisions but produces a different id on the server than on the client, which breaks hydration.',
        },
        { id: 'b', text: 'Both are equally fine; browsers deduplicate ids automatically at parse time.' },
        { id: 'c', text: 'The hardcoded id is fine as long as CSS does not target it; Math.random is the only real bug.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'useId exists for exactly this pair of failures: unique per instance (unlike a hardcoded string) and identical between server and client render (unlike Math.random or a mutable counter).',
    },
    {
      id: 'q6',
      prompt: 'Where does `useInsertionEffect` run relative to `useLayoutEffect` and `useEffect`, and what is it actually for?',
      choices: [
        {
          id: 'a',
          text: 'Before useLayoutEffect and before the browser could apply new layout to the current commit\'s DOM changes — for CSS-in-JS libraries injecting style tags before layout is read with the wrong styles.',
        },
        { id: 'b', text: 'After useEffect, as a final cleanup pass once all other effects for the commit have settled.' },
        { id: 'c', text: 'At the same time as useLayoutEffect, and interchangeable with it for any DOM-measurement code.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "useInsertionEffect runs earliest of the three, specifically so style-injecting libraries can add rules before layout effects (or the browser) measure or paint with stale styles. It can't do ref-based DOM measurement — refs aren't attached yet.",
    },
  ],
};
