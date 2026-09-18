import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A page has one `<link rel="stylesheet" href="theme.css">` in `<head>` and, right after it, a classic `<script src="app.js">` with no `async`/`defer`. What does the browser do before it can start running `app.js`?',
      choices: [
        { id: 'a', text: 'Run it immediately in parallel with the stylesheet download; scripts never wait on CSS.' },
        { id: 'b', text: 'Wait for `theme.css` to finish downloading and parsing, because the script might read computed styles, then wait for `app.js` itself to download.' },
        { id: 'c', text: 'Skip `app.js` entirely until `DOMContentLoaded`, the same as if it had `defer`.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A classic synchronous script is parser-blocking and waits on any preceding render-blocking CSS, since the script could synchronously query computed styles that depend on that CSS. `defer`/`type="module"` is what gets you the "wait for DOMContentLoaded" behavior in choice C — this script has neither.',
    },
    {
      id: 'q2',
      prompt:
        'Which of these style changes on an element skips layout entirely and goes straight to paint + composite (or composite alone)?',
      choices: [
        { id: 'a', text: 'Changing `width` from 100px to 200px.' },
        { id: 'b', text: 'Changing `color` from black to red.' },
        { id: 'c', text: 'Changing `display: block` to `display: none`.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A color change doesn’t move any geometry, so it triggers paint and composite but not layout. Both `width` and toggling `display: none` change an element’s box (or remove it from the render tree), which forces a full layout pass.',
    },
    {
      id: 'q3',
      prompt:
        'A drag handler runs this once per pointermove: read `el.getBoundingClientRect()`, then immediately set `el.style.left`, for 30 dragged elements in a loop, interleaved (read one, write one, read the next, write the next…). What’s the actual problem, and what’s the fix?',
      choices: [
        {
          id: 'a',
          text: 'The problem is that `getBoundingClientRect` is slow by itself; the fix is to cache the result once per drag.',
        },
        {
          id: 'b',
          text: 'The problem is that each read forces a synchronous layout flush of the pending write from the previous iteration; the fix is to do all 30 reads first, then all 30 writes.',
        },
        {
          id: 'c',
          text: 'The problem is that `style.left` triggers a network request to re-fetch layout data; the fix is to use `transform` for the initial read too.',
        },
      ],
      correctChoiceId: 'b',
      explanation:
        'This is textbook layout thrashing: each read-after-write pair forces the browser to synchronously flush and recompute layout to answer the read. Batching all reads before all writes lets the browser flush layout at most once for the whole loop instead of once per element.',
    },
    {
      id: 'q4',
      prompt:
        'You run: `queueMicrotask(() => console.log("A"))`, then `setTimeout(() => console.log("B"), 0)`, then `Promise.resolve().then(() => console.log("C"))`, all in the same synchronous block. What logs, in what order?',
      choices: [
        { id: 'a', text: 'A, C, B — both microtasks drain before the task runs, in the order they were queued.' },
        { id: 'b', text: 'B, A, C — the task queue is checked first.' },
        { id: 'c', text: 'It’s nondeterministic; microtasks and tasks race.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'After the synchronous block finishes, the browser drains the entire microtask queue — both `queueMicrotask` and the resolved promise’s `.then` — in FIFO order, before it ever looks at the task queue where the `setTimeout` callback is waiting.',
    },
    {
      id: 'q5',
      prompt:
        'Why does chaining ten `queueMicrotask` calls to break up an expensive synchronous computation fail to fix a bad INP (Interaction to Next Paint) score, while `scheduler.yield()` (or a `MessageChannel`-based yield) does?',
      choices: [
        {
          id: 'a',
          text: 'Microtasks run slower than tasks per-callback, so the total work takes longer either way.',
        },
        {
          id: 'b',
          text: 'The microtask queue fully drains before the browser gets a rendering opportunity, so ten chained microtasks still block any paint until all ten finish; a real task-queue yield lets a paint happen in between.',
        },
        { id: 'c', text: 'queueMicrotask is deprecated and no longer runs in modern browsers.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Rendering opportunities happen between tasks, never in the middle of a microtask drain. Splitting work across microtasks changes nothing about when the browser can paint; only yielding back to the task queue does.',
    },
    {
      id: 'q6',
      prompt:
        'A component does a client-side sort of 50,000 rows synchronously inside an event handler, with no DOM reads in the loop. Chunking it with `await yieldToMain()` every 500 rows keeps the UI responsive, but moving the sort into a Web Worker would be strictly better here. Why?',
      choices: [
        {
          id: 'a',
          text: 'Workers run on a separate thread, so the main thread isn’t blocked at all during the sort, not just less blocked between yields.',
        },
        { id: 'b', text: 'Workers are not actually better; chunking on the main thread always produces identical responsiveness.' },
        { id: 'c', text: 'Workers can access the DOM directly, so they can update the list without posting a message back.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'Chunking with yields still runs every chunk on the main thread — the UI stays responsive only during the gaps between chunks. A worker moves the whole computation off the main thread entirely, so input handling and rendering are never contended with it. (Workers also have no DOM access at all — choice C is backwards.)',
    },
  ],
};
