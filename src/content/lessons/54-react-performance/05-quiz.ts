import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'React DevTools Profiler shows a component with `baseDuration: 42ms` and `actualDuration: 0.1ms` for a commit. What does that combination tell you?',
      choices: [
        { id: 'a', text: 'The component is broken — it should have taken 42ms but only took 0.1ms.' },
        {
          id: 'b',
          text: "The component bailed out of re-rendering (memoization worked): it would cost 42ms to build this subtree from scratch, but this commit paid almost none of that.",
        },
        { id: 'c', text: '`baseDuration` is always wrong in development builds and can be ignored.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`baseDuration` estimates the from-scratch cost of the subtree; `actualDuration` is what this specific commit paid, benefiting from any memoization. A huge gap between them is a memoization success, not a bug — watch for `actualDuration` creeping toward `baseDuration` over time instead, which signals a regression.',
    },
    {
      id: 'q2',
      prompt:
        'You want to know, right now, which components on a live page are re-rendering more than expected, without recording anything first. What is the fastest tool for that specific question?',
      choices: [
        { id: 'a', text: 'Record a full Chrome DevTools Performance trace and read the Components track.' },
        { id: 'b', text: '`react-scan`, run against the live page — it highlights re-rendering components in real time with no recording step.' },
        { id: 'c', text: 'Add `console.log` to every component and read the browser console.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "react-scan is built for exactly this — an ambient overlay that shows you where to look, in seconds, with no code changes. Recording a full Performance trace answers a broader question (React work in the context of everything else the browser is doing) but costs more setup for a question this narrow.",
    },
    {
      id: 'q3',
      prompt:
        'A component re-renders 200 times a second while the user drags a slider, and its render function is just `<span>{value}</span>`. Is this a performance problem worth fixing?',
      choices: [
        {
          id: 'a',
          text: 'No — a cheap render function re-rendering often costs almost nothing; the fix budget belongs on renders that do real work or touch the DOM expensively.',
        },
        { id: 'b', text: 'Yes — any component re-rendering more than 60 times a second should always be memoized.' },
        { id: 'c', text: 'Yes — React has a hard limit on re-renders per second and this will throw eventually.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "Re-render count and re-render cost are different questions. A function call and diff on trivial output costs microseconds regardless of frequency. Chase this only if the Profiler shows real time being spent — otherwise you're memoizing something that was never the bottleneck.",
    },
    {
      id: 'q4',
      prompt:
        'A search input filters a large table. Typing feels laggy — each keystroke visibly pauses before appearing in the box. Where should the fix go?',
      choices: [
        {
          id: 'a',
          text: 'Wrap the table update (not the input\'s own state) with `useDeferredValue` or a transition, so the input stays synchronous and the expensive re-render becomes interruptible.',
        },
        { id: 'b', text: 'Wrap the entire component in `React.memo`.' },
        { id: 'c', text: 'Move the filter state into `useReducer` instead of `useState`.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "The input lagging means the expensive table render is blocking the keystroke itself, because both are on the same synchronous update. `useDeferredValue` (or `startTransition`) splits them: the input's own state updates immediately, and the derived expensive value updates at lower, interruptible priority. `React.memo` on the whole component wouldn't help — the component's own state is what's changing.",
    },
    {
      id: 'q5',
      prompt:
        "A wizard's step 2 is expensive to initialize. A teammate suggests mounting it inside `<Activity mode=\"hidden\">` while step 1 is showing, then flipping to `mode=\"visible\"` on navigation. What's the actual benefit, precisely?",
      choices: [
        {
          id: 'a',
          text: 'Step 2\'s initial render and effects can happen in the background before the user navigates, so the flip to visible has less work left to do — it is not free, but the cost moves earlier and off the critical path.',
        },
        { id: 'b', text: 'Activity makes step 2 render instantly with zero cost, forever, once mounted.' },
        { id: 'c', text: 'Activity prevents step 2 from ever re-rendering again after the first mount.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "Activity doesn't eliminate the cost of mounting step 2 — it relocates when that cost is paid, from \"the moment the user is waiting for it\" to \"while they're busy reading step 1.\" It's speculative pre-rendering, appropriate for a likely-next screen, not a way to make expensive work free.",
    },
    {
      id: 'q6',
      prompt:
        'A bundle analyzer treemap shows a date-formatting library taking up an unexpectedly large slice of the production bundle, even though the app calls it in exactly one place. What is the most direct fix?',
      choices: [
        {
          id: 'a',
          text: "Check whether a lighter import path or the platform's own `Intl` API covers that one call, and whether the library's full import is pulling in locale data or parsers the app never uses.",
        },
        { id: 'b', text: 'Nothing to do — bundle size only matters for mobile users, and this is a desktop app.' },
        { id: 'c', text: 'Wrap the one call site in `React.memo` to stop it from being included in the bundle.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "A treemap answers 'what's heavy,' not 'what's slow' — the fix is at the import, not the render. `React.memo` affects re-renders, not what ships in the bundle. This is exactly the class of problem bundle analysis (rollup-plugin-visualizer, vite-bundle-analyzer, source-map-explorer) exists to surface, since it's invisible from the runtime Profiler.",
    },
  ],
};
