import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A component tree is wrapped in `<Activity mode="hidden">`. What happens to a `useEffect` inside that tree that is currently subscribed to a WebSocket?',
      choices: [
        { id: 'a', text: 'Nothing changes; effects keep running normally regardless of Activity mode, only the DOM is hidden.' },
        { id: 'b', text: "The effect's cleanup runs (closing the connection), and the effect does not run again until the Activity becomes visible." },
        { id: 'c', text: 'The component unmounts entirely, along with its state, exactly as if the JSX had been removed from the tree.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Hidden `<Activity>` content stays mounted (state and DOM survive), but its effects are torn down: cleanup functions run, and the effects do not fire again until the boundary flips back to visible. That is what makes it safe to hide expensive subtrees liberally — the state is preserved, but hidden trees are not holding connections open or doing background work.',
    },
    {
      id: 'q2',
      prompt: 'What is the most accurate way to describe what `<Activity mode="hidden">` does, compared to `{condition && <Panel />}`?',
      choices: [
        { id: 'a', text: 'They are equivalent; both remove the panel from the DOM when the condition is false.' },
        { id: 'b', text: '`<Activity>` keeps the component mounted with its state and DOM preserved but its effects torn down, while conditional rendering unmounts and fully discards the component.' },
        { id: 'c', text: '`<Activity>` is purely a CSS utility; the underlying component is unmounted the same way as with conditional rendering.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Conditional rendering with `&&` unmounts the component when the condition flips to false, discarding all of its state. `<Activity mode="hidden">` keeps the component instance and its state alive, and preserves the DOM nodes React already built, while stopping its effects and deferring its updates.',
    },
    {
      id: 'q3',
      prompt:
        'A component reads `useEffectEvent`-created function directly in its render body (not inside an effect) to decide what to display. Why is this wrong even if it happens to run without a compile error?',
      choices: [
        { id: 'a', text: "It isn't wrong — `useEffectEvent` functions are safe to call from anywhere, including render." },
        { id: 'b', text: "`useEffectEvent` functions are meant to be called only from inside an effect (or an effect's own callback); using one during render breaks the contract that keeps render pure and defeats the reason the hook exists." },
        { id: 'c', text: 'It throws a runtime error immediately, because React tracks the call stack and rejects calls outside effects.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "React doesn't stop you syntactically, but the hook's whole design assumes it is only invoked from effect code that runs after render, not during it. Calling it during render reintroduces the exact staleness/purity problems `useEffectEvent` exists to avoid, and the lint rule for it flags this pattern.",
    },
    {
      id: 'q4',
      prompt:
        'An effect syncs a room connection and needs to log the current username whenever a message arrives, without reconnecting when the username changes. Which dependency array and structure is correct?',
      choices: [
        {
          id: 'a',
          text: 'List both `roomId` and `username` as dependencies, so the effect always has the current username.',
        },
        {
          id: 'b',
          text: 'Read `username` inside a `useEffectEvent`-wrapped handler called from the message listener, and depend on only `[roomId]` in the effect itself.',
        },
        {
          id: 'c',
          text: 'Depend on `[roomId]` only, and read `username` directly from the outer closure inside the message listener.',
        },
      ],
      correctChoiceId: 'b',
      explanation:
        'Option (a) reconnects on every username change, which is wasteful and wrong if the room itself did not change. Option (c) reads a stale `username` captured when the effect last ran. Option (b) is the actual purpose of `useEffectEvent`: the effect resyncs only when `roomId` (the truly reactive value) changes, while the effect event always sees the latest `username` when it is invoked.',
    },
    {
      id: 'q5',
      prompt:
        'A team wants a "select an item from a grid, see it expand into a detail view" interaction to visually cross-fade the thumbnail into the full image, using `<ViewTransition>`. Which prop pairing on matching `<ViewTransition name="...">` boundaries produces that cross-fade, rather than the thumbnail abruptly exiting and the detail view abruptly entering?',
      choices: [
        { id: 'a', text: '`enter` on the thumbnail and `exit` on the detail view.' },
        { id: 'b', text: '`share`, driven by both boundaries using the same `name` — one unmounting while the other mounts.' },
        { id: 'c', text: '`update`, because the image is conceptually "the same element" changing size.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "`share` is specifically the case where a different `<ViewTransition>` with the same `name` is unmounting elsewhere while this one mounts — the shared-element transition. `enter`/`exit` are for ordinary independent mount/unmount with nothing matching on the other side, and `update` is for a single boundary's own content changing shape without mounting or unmounting.",
    },
    {
      id: 'q6',
      prompt: 'Why does wrapping a state update in `startTransition` matter for `<ViewTransition>`, given that `<ViewTransition>` is just a component you render?',
      choices: [
        { id: 'a', text: "It doesn't matter; `<ViewTransition>` animates any state update, synchronous or not." },
        { id: 'b', text: '`<ViewTransition>` only activates for updates React already treats as interruptible and async — `startTransition`, `useDeferredValue`, Actions, or a Suspense reveal — because a synchronous update commits immediately and cannot wait for a browser animation to run.' },
        { id: 'c', text: '`startTransition` is required syntactically; rendering `<ViewTransition>` without it throws at runtime.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "A plain synchronous `setState` commits immediately, which is the point of it being synchronous — it can't also pause to let a view transition animate. `<ViewTransition>` only triggers its animation for updates that go through React's async/interruptible paths, which is why the interaction has to be initiated inside `startTransition` (or via a Suspense reveal, `useDeferredValue`, or an Action) rather than a bare `setState`.",
    },
  ],
};
