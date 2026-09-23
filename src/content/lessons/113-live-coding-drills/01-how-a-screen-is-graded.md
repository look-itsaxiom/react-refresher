# How a React screen is graded

A live-coding screen is not a puzzle with one right answer — it's a 45-minute sample of how
you work. The interviewer already has a rubric before you open the editor. Knowing its shape
changes how you spend your time.

## What's actually being scored

Most rubrics for a "build this component" round break down roughly like this, in order of
weight:

1. **Do you clarify before you type.** Restate the requirements in your own words, ask about
   the two or three ambiguous bits (what happens on error? is this list bounded?), and sketch
   the state shape out loud before touching the keyboard. Interviewers read silence-then-typing
   as "hasn't thought about the data model yet," even when the code that follows is fine.
2. **Does a correct version exist by the halfway mark.** Not the polished version — a version
   that renders the data, responds to the obvious interaction, and doesn't throw. Getting the
   happy path working early is what buys you time for the rest.
3. **Do you handle the edge cases the prompt implied but didn't spell out.** Empty lists,
   failed requests, duplicate submissions, the thing that happens if the user clicks twice.
   Interviewers usually have two or three of these queued up as follow-ups; naming them
   yourself before being asked is a strong signal.
4. **Accessibility and performance, treated as requirements, not extras.** Can the list be
   operated by keyboard? Is there a label on that input? Does rendering 5,000 rows freeze the
   tab? You don't need to gold-plate this, but you need to notice it and say what you'd do.
5. **Communication throughout.** Narrating tradeoffs ("I could debounce this, but
   `useDeferredValue` fits better because it's a `startTransition`-based update, not a network
   call") shows judgment a silent solution can't. "In production I would add X" is a legitimate
   move when you're out of time — it shows you know what's missing without spending the clock
   on it.

Correctness first, then edge cases, then a11y/perf — in that order, out loud.

## React 19 idioms to reach for

You've spent this course moving off React 18 habits; a live screen is where that pays off.
Default to these when the shape fits, and say why when you pick one:

- **`useActionState`** for a form submission that talks to a server: it gives you pending
  state, the last result, and a reset-on-success without extra `useState` bookkeeping.
- **`useOptimistic`** for "show the change immediately, reconcile when the server responds."
  Reach for it specifically when a *pending, uncommitted* value needs to render — not for
  every mutation.
- **`useTransition`** for updates that are real state changes but not urgent — marking a tab
  switch or a sort as non-blocking so typing and clicking stay responsive.
- **`useDeferredValue`** for filtering or searching a large list from a fast-changing input.
  It's not a debounce: there's no timer, and React keeps the input itself synchronous while
  the expensive re-render lags one step behind, coalescing rapid keystrokes into fewer commits.
- **`useId`** for wiring a label to an input, or an error message to a field via
  `aria-describedby`, without inventing DOM ids by hand.
- **Refs as a prop** — `function Row({ ref }: { ref?: Ref<HTMLTableRowElement> })` — for
  forwarding a DOM node without `forwardRef`, if the exercise needs it.
- **`<form action={fn}>`** as the default way to wire a submit handler, letting you skip
  `preventDefault` and wire `useFormStatus` inside a submit button for free.

## Classic pitfalls interviewers watch for

- **Deriving state that should be computed.** A `filteredCount` in `useState` that drifts from
  the actual filtered array. If a value can be computed from props/state during render, don't
  store it separately.
- **Stale closures in timers or debounced handlers.** A `setTimeout` or interval that captured
  an old value of a prop or piece of state because the effect's dependency array was wrong or
  missing.
- **Keys by array index.** Fine for a static list that never reorders; wrong the moment rows
  can be inserted, removed, filtered, or sorted — state and DOM nodes attach to the wrong row.
- **Effects for derived data.** `useEffect(() => setFiltered(items.filter(...)), [items, q])`
  is an extra render and a source of stale UI; compute `filtered` inline or in `useMemo`.
- **Forgetting loading/error/empty states.** A table that only renders correctly when the data
  is non-empty and the request succeeded is a table that fails the first edge-case question.
- **Uncontrolled-to-controlled switches.** An input whose `value` prop is `undefined` on first
  render and a string after data loads — React warns, and the input loses focus. Default to
  `''` from the start.

## The "talk while you type" script

You don't need a performance — you need a running commentary an interviewer can follow without
asking "what are you doing now?" A workable loop: **state the plan for the next few lines →
write them → say what you just changed → check it against the requirement list.** When you hit
an edge case not yet requested, name it ("I'll come back to the empty state") instead of
silently deferring it — a deferred item you named counts differently than one you forgot.

## When you get stuck

Say what you expected to happen and what happened instead — out loud, specifically. "I expected
the select's `onChange` to fire once; it's firing twice" is a debugging statement an interviewer
can help with. Fall back to `console.log`-driven debugging without embarrassment; reading state
at the point of confusion beats staring at the code. If a library API's exact signature escapes
you, say the shape you want ("I want the pending flag from this action") and write toward it —
close-enough code you can self-correct beats a frozen cursor.

## How to use the three drills that follow

Each drill states a real interview prompt and a time target. Set a 25-minute timer, write the
solution cold in the sandbox editor with the prompt as your only spec, and stop when the timer
ends whether or not you're done — running out of time on a drill is data, not failure. Only
after the timer stops, open the solution and read it as a code review: what did it handle that
you didn't, what would you say differently out loud, which idiom above did it reach for. The
checks mirror what an interviewer would actually probe — correctness, then the edge cases, then
accessibility and performance — so a passing run is a reasonable proxy for a passing screen.

## Further reading (optional)

- [react.dev — Actions](https://react.dev/reference/rules/components-and-hooks-must-be-pure) —
  rules that keep render pure, the foundation under most of the pitfalls above.
- [react.dev — `useOptimistic`](https://react.dev/reference/react/useOptimistic)
- [react.dev — `useDeferredValue`](https://react.dev/reference/react/useDeferredValue)
- [web.dev — Virtualize large lists](https://web.dev/articles/virtualize-long-lists-react-window) —
  the rationale behind windowed rendering, even when you hand-roll it instead of using a library.
