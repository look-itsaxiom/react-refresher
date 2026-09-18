import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'You write `items.forEach(async (item) => { await save(item); })` to save ten items. What actually happens?',
      choices: [
        {
          id: 'a',
          text: 'Each `save` call waits for the previous one, so the ten saves happen sequentially, one at a time.',
        },
        {
          id: 'b',
          text: 'All ten `save` calls start immediately in parallel, and `forEach` returns before any of them settle — a rejection inside one becomes an unhandled rejection unless something else catches it.',
        },
        { id: 'c', text: 'It throws a `SyntaxError` — `forEach` cannot take an async callback.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`forEach` never awaits the return value of its callback; it just calls the callback ten times back to back and moves on. Each call still runs (starting all ten `save`s essentially at once), but nothing is tracking their completion or their errors. `for...of` with `await`, or `Promise.all(items.map(...))`, are the two correct replacements depending on whether you want sequential or parallel.',
    },
    {
      id: 'q2',
      prompt:
        'You race a fetch against a 3-second timeout with `Promise.race([fetch(url), timeout(3000)])`. The timeout wins. Two seconds later, the fetch itself rejects (the server was slow, then errored). What should you make sure happens to that rejection?',
      choices: [
        {
          id: 'a',
          text: 'Nothing — once `Promise.race` has settled, every other promise it was racing is automatically cancelled and its rejection discarded.',
        },
        {
          id: 'b',
          text: 'Nothing needs to be done; a promise that loses a race is garbage collected before it can reject.',
        },
        {
          id: 'c',
          text: 'Something still needs to observe it — attach a `.catch(() => {})` (or otherwise handle it) on the losing promise yourself, since `Promise.race` doesn’t cancel or observe the promises it didn’t pick, and an unobserved rejection becomes an unhandled rejection.',
        },
      ],
      correctChoiceId: 'c',
      explanation:
        '`Promise.race` (and `any`) only stop *listening* to the other promises once one settles — they never cancel the underlying work or attach a handler to the losers. If the fetch had a way to be cancelled (an `AbortController`), aborting it on timeout is the fuller fix; either way, something needs to observe or suppress that eventual rejection.',
    },
    {
      id: 'q3',
      prompt:
        'A dashboard has five independent widgets, each fetching its own data. One widget’s fetch is flaky. Which promise combinator fits, and why?',
      choices: [
        {
          id: 'a',
          text: '`Promise.all` — if any widget fails, showing a fully broken dashboard is safer than showing a partial one.',
        },
        {
          id: 'b',
          text: '`Promise.allSettled` — each widget’s success or failure is independent, so one failing shouldn’t blank out the other four; you can render each widget from its own settled result.',
        },
        { id: 'c', text: '`Promise.any` — you only need one widget to succeed for the dashboard to be usable.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`allSettled` is exactly for “these are independent, and I want every outcome, success or failure.” `all` fails the whole batch over one flaky widget, and `any` would mean four widgets silently never render as long as one succeeds — neither matches “each widget stands on its own.”',
    },
    {
      id: 'q4',
      prompt:
        'A function accepts an optional `signal?: AbortSignal` and needs to stop if either that caller-supplied signal aborts, or a 5-second internal timeout elapses — whichever comes first. What’s the correct way to get one signal representing both?',
      choices: [
        {
          id: 'a',
          text: 'Manually listen for `abort` on the caller’s signal, and separately call `abort()` on a fresh `AbortController` from a `setTimeout(..., 5000)`, then pass whichever fired.',
        },
        {
          id: 'b',
          text: '`AbortSignal.any([signal, AbortSignal.timeout(5000)].filter(Boolean))` — composes into one signal that aborts as soon as either input does.',
        },
        { id: 'c', text: 'Signals can’t be composed; you have to pick one or the other, not both.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`AbortSignal.any` exists precisely to combine multiple abort sources into one signal without hand-rolling listener wiring. `AbortSignal.timeout(ms)` gives you the timeout half as a signal directly, so the whole thing is a one-liner. Choice A works but is exactly the boilerplate `AbortSignal.any` replaces.',
    },
    {
      id: 'q5',
      prompt:
        'A component polls an endpoint every 2 seconds with `setInterval` while a user has the tab open in the background (switched to another tab). What actually happens to that polling, and what should the component do about it?',
      choices: [
        {
          id: 'a',
          text: 'Nothing changes — timers run identically whether a tab is foregrounded or backgrounded.',
        },
        {
          id: 'b',
          text: 'The browser throttles a backgrounded tab’s timers to roughly once per second at best (sometimes freezing them entirely); the component should check `document.visibilityState` and pause or reduce polling in the background rather than assume the interval is firing on schedule.',
        },
        { id: 'c', text: 'The interval callback throws an error the moment the tab is backgrounded.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Browsers throttle timers in hidden tabs to save battery and CPU — a 2-second interval doesn’t reliably fire every 2 seconds once backgrounded. Code that depends on timer regularity (polling, animations, timeouts measuring real elapsed time) should react to `visibilitychange` rather than assume the interval is honored.',
    },
    {
      id: 'q6',
      prompt:
        'Inside `startTransition(async () => { const data = await load(); setData(data); })`, is the `setData(data)` call automatically treated as part of the transition (non-blocking), the same way the `load()` call itself is?',
      choices: [
        {
          id: 'a',
          text: 'Yes — React 19 tracks the entire async function as one transition, including every state update inside it, no matter how many `await`s came before.',
        },
        {
          id: 'b',
          text: 'No — only the synchronous portion before the first `await`, and `isPending` being held true through the `await`, are handled automatically; a `set` call that comes after an `await` needs its own `startTransition` wrapper to stay non-blocking.',
        },
        { id: 'c', text: 'No — async functions cannot be passed to `startTransition` at all; this code throws.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'React 19 improved `isPending` tracking to last through the whole async function, but state updates after an `await` still need to be re-wrapped in their own `startTransition` call to be treated as low-priority instead of a blocking, synchronous update. It’s a real, documented gap in the API as of late 2026, not a misunderstanding — worth re-checking against the current React changelog.',
    },
  ],
};
