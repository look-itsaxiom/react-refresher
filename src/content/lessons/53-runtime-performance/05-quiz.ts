import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A click handler runs in 5ms, but the interaction\'s measured INP is 380ms. The Performance panel shows the interaction was queued behind an unrelated long task from a `setInterval` callback that started just before the click and ran for 350ms. Which INP phase is responsible, and what fixes it?',
      choices: [
        { id: 'a', text: 'Processing time is the problem; the click handler itself needs to be optimized further.' },
        {
          id: 'b',
          text: 'Input delay is the problem; the handler can\'t start until the main thread frees up, so the fix is making the unrelated long task yield (or run less/elsewhere), not touching the 5ms handler.',
        },
        { id: 'c', text: 'Presentation delay is the problem; switch the click handler\'s state update to use `transform` instead of layout-affecting properties.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Input delay covers the time from the physical input to the handler actually starting. A 5ms handler blocked behind a 350ms unrelated long task produces exactly this pattern — the fix is making whatever\'s occupying the main thread yield or move off it, since the handler itself is already fast.',
    },
    {
      id: 'q2',
      prompt:
        'Why does chunking a 200ms computation with `await scheduler.yield()` every 20ms, without also moving a `setPending(true)` update before the loop starts, still risk showing the user nothing until the computation finishes?',
      choices: [
        {
          id: 'a',
          text: 'It doesn\'t — chunking alone is sufficient regardless of when the pending state is set.',
        },
        {
          id: 'b',
          text: 'scheduler.yield() only works if called at least 10 times, so a 200ms/20ms-chunk computation doesn\'t yield enough to matter.',
        },
        {
          id: 'c',
          text: 'If the pending-state update happens inside or after the first chunk instead of before it, the user sees the same unresponsive control for at least that first chunk\'s duration before any feedback paints — chunking helps the middle of the work, not the perceived start.',
        },
      ],
      correctChoiceId: 'c',
      explanation:
        '"Feedback first, then work" is about ordering: the pending UI has to be set and yielded past before the heavy work begins, not just interspersed with it. Chunking without that ordering still delays the very first paint of feedback by however long the first chunk takes.',
    },
    {
      id: 'q3',
      prompt:
        'A search input filters 80,000 client-side rows on every keystroke with `.filter()` over the raw array. Typing feels laggy. Debouncing the `<input>`\'s own displayed value by 300ms removes the lag. What\'s the downside of that specific fix, and what\'s the better alternative?',
      choices: [
        {
          id: 'a',
          text: 'There is no downside; debouncing the input value is the standard fix for this exact problem.',
        },
        {
          id: 'b',
          text: 'Debouncing the displayed input value makes typing itself feel laggy (characters lag behind keystrokes); the better fix is letting the input update immediately and debouncing only the expensive filter/derived-list computation.',
        },
        { id: 'c', text: 'Debouncing only works with `useDeferredValue`, not with a manual `setTimeout`, so a manual debounce wouldn\'t compile.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The text field itself is cheap to update on every keystroke; it\'s the derived filter that\'s expensive. Debouncing the field\'s value conflates the two and makes the cheap part (typing) feel slow. Debouncing (or deferring) only the expensive derived computation keeps typing responsive while still avoiding 80,000-row filters on every single keystroke.',
    },
    {
      id: 'q4',
      prompt:
        'A virtualized list renders `overscan={2}` above and below the visible rows. A screen reader user tabs past the last rendered row expecting to reach the next item in the full 5,000-row list. What goes wrong if the list only handles virtualization at the rendering level, and what closes the gap?',
      choices: [
        {
          id: 'a',
          text: 'Nothing goes wrong — virtualization is purely visual and has no effect on keyboard or screen reader navigation.',
        },
        {
          id: 'b',
          text: 'Tabbing (or arrow-keying) past the rendered window has nowhere to go, since the next row doesn\'t exist in the DOM yet; closing the gap means driving the window from focus/keyboard navigation (mounting and scrolling to the next index) and exposing full-set position via `aria-posinset`/`aria-setsize` or `aria-rowindex`, not just rendering fewer rows.',
        },
        {
          id: 'c',
          text: 'The fix is increasing `overscan` to cover the entire list, which removes the accessibility gap without other changes.',
        },
      ],
      correctChoiceId: 'b',
      explanation:
        'Virtualization\'s DOM-level trick (only mounting a window of rows) breaks assistive tech navigation unless the component also drives the window from focus movement and communicates position within the *full* set, not just the mounted one. Overscanning the entire list defeats virtualization\'s purpose and doesn\'t scale.',
    },
    {
      id: 'q5',
      prompt:
        'A component\'s `useEffect` calls `window.addEventListener(\'resize\', handleResize)` with no cleanup function, and the component mounts and unmounts repeatedly as the user navigates a single-page app. What does Chrome DevTools\' Memory panel show after several mount/unmount cycles, and why?',
      choices: [
        {
          id: 'a',
          text: 'Nothing unusual — `addEventListener` without a matching `removeEventListener` is automatically cleaned up when the component unmounts.',
        },
        {
          id: 'b',
          text: 'A growing number of detached instances and listener callbacks that never get garbage collected, because each mount adds another listener referencing that instance\'s closure, and nothing ever removes it — a classic leak a heap snapshot comparison across mount/unmount cycles would surface as a climbing count.',
        },
        { id: 'c', text: 'A single leaked listener, since `window` only ever holds one `resize` listener regardless of how many times it\'s added.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'React\'s effect cleanup is opt-in: it only removes what your cleanup function removes. Without `return () => window.removeEventListener(\'resize\', handleResize)`, every mount adds a new listener whose closure keeps that render\'s state alive, and `window` never drops any of them. Comparing heap snapshots taken before and after several mount/unmount cycles is exactly how you\'d confirm this in DevTools.',
    },
    {
      id: 'q6',
      prompt:
        'A component calls `structuredClone(largeConfigObject)` on every render to "safely" pass a copy to a child, even on renders where `largeConfigObject` hasn\'t changed. What kind of performance problem is this, distinct from a long task or a memory leak, and what\'s the fix?',
      choices: [
        {
          id: 'a',
          text: 'It\'s a memory leak, because `structuredClone` never releases its copies; the fix is calling `WeakRef` on the result.',
        },
        {
          id: 'b',
          text: 'It\'s allocation churn / GC pressure: cloning the whole object graph every render creates a lot of short-lived garbage even though nothing leaks, which can trigger more frequent GC pauses; the fix is cloning only when the source object actually changes (e.g., behind a `useMemo` keyed on it), or avoiding the clone if isolation isn\'t actually needed.',
        },
        { id: 'c', text: 'It\'s a forced synchronous layout, the same category as reading `getBoundingClientRect` after a style write.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`structuredClone` walks and copies an entire object graph on every call. Doing that unconditionally on every render generates garbage proportional to render frequency, not to actual data changes — every clone is reclaimed eventually (not a leak), but the allocation rate itself can cause more frequent, main-thread-blocking GC pauses. Gating the clone on an actual change removes the churn.',
    },
  ],
};
