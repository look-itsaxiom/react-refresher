import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A function receives an array prop and needs to return a sorted copy for display, without touching the array the caller still holds a reference to. Which is correct and idiomatic today?',
      choices: [
        { id: 'a', text: '`items.sort((a, b) => a.rank - b.rank)` — `.sort()` already returns a new array.' },
        { id: 'b', text: '`[...items].sort((a, b) => a.rank - b.rank)`, since `.sort()` mutates whatever it is called on.' },
        { id: 'c', text: '`items.toSorted((a, b) => a.rank - b.rank)`, which sorts and returns a new array in one call.' },
      ],
      correctChoiceId: 'c',
      explanation:
        '`.sort()` mutates the array it is called on and returns the same reference — option (a) is a real, common bug because the caller\'s array changes too. The `[...items].sort()` idiom in (b) works but takes two steps to say one thing. `toSorted()` (ES2023) does the copy and the sort in one non-mutating call, which is exactly what a function handed someone else\'s array should reach for.',
    },
    {
      id: 'q2',
      prompt:
        'You need to bucket a list of orders by `status` into a lookup object. Which reaches for the right tool?',
      choices: [
        { id: 'a', text: '`orders.reduce((acc, o) => { (acc[o.status] ??= []).push(o); return acc; }, {})`' },
        { id: 'b', text: '`Object.groupBy(orders, (o) => o.status)`' },
        { id: 'c', text: '`new Map(orders.map((o) => [o.status, o]))`' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`Object.groupBy` does exactly this in one call and is the direct replacement for the `reduce`-into-an-accumulator idiom in (a) — which still works, but is now the long way to write something with a name. (c) is wrong regardless of API era: a `Map` keyed by status with one order each would silently overwrite every order but the last with the same status, since `Map` keys are unique.',
    },
    {
      id: 'q3',
      prompt:
        'A function receives a possibly-huge array of tag strings from two different sources and needs to return every tag that appears in both. What is the most direct ES2025 way to express that?',
      choices: [
        { id: 'a', text: '`tagsA.filter((t) => tagsB.includes(t))`' },
        { id: 'b', text: '`new Set(tagsA).intersection(new Set(tagsB))`, then spread to an array if an array is needed' },
        { id: 'c', text: '`Object.groupBy([...tagsA, ...tagsB], (t) => t)`, then keep only groups of length 2' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`Set.prototype.intersection` (ES2025) says directly what you mean and, unlike (a), does not degrade to checking every item in `tagsB` for every item in `tagsA`. (c) technically could be made to work but is an odd, indirect way to express "in both" and breaks if a tag legitimately appears more than once in one list.',
    },
    {
      id: 'q4',
      prompt:
        'A helper needs to expose `resolve`/`reject` for a promise to code outside the function that creates it — a WebSocket message handler resolving a pending request when a matching reply arrives, for instance. Which is the current idiom?',
      choices: [
        { id: 'a', text: 'Declare `let resolve, reject;` above a `new Promise((res, rej) => { resolve = res; reject = rej; })` and return all three.' },
        { id: 'b', text: '`const { promise, resolve, reject } = Promise.withResolvers();`' },
        { id: 'c', text: 'Return the `new Promise(...)` executor function itself and let the caller invoke it to get the resolvers.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`Promise.withResolvers()` (ES2024) returns exactly `{ promise, resolve, reject }` without the captured-variable dance in (a) — same result, no `let` declarations that exist only to escape the constructor\'s closure. (c) does not do what\'s described; the executor function\'s parameters are the resolvers, but invoking it a second time from outside does not do anything useful.',
    },
    {
      id: 'q5',
      prompt:
        'A pipeline needs to pull the first 10 matching records out of a source that might yield millions of rows (a database cursor wrapped as an async iterable, say), stopping as soon as it has 10. Which approach avoids paying for rows past the 10th?',
      choices: [
        { id: 'a', text: '`[...source].filter(matches).slice(0, 10)`' },
        { id: 'b', text: '`source.filter(matches).take(10).toArray()`, using iterator helpers directly on the source' },
        { id: 'c', text: '`Array.fromAsync(source).then((all) => all.filter(matches).slice(0, 10))`' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Iterator helpers are lazy and pull-based: `.filter()` and `.take()` chained on the source only pull as many upstream items as needed to produce 10 matches, then stop. Both (a) and (c) fully drain the source into memory first — spreading or `Array.fromAsync`-ing it — before filtering or slicing anything, which is exactly the cost the lazy version avoids.',
    },
    {
      id: 'q6',
      prompt:
        'A teammate wants to start using `Temporal` and `using` declarations in a shared component library that runs its test suite on Node 22 today. What is the accurate status check before agreeging?',
      choices: [
        { id: 'a', text: 'Both are Stage 4 / spec-final, so they can be used directly with no further checks.' },
        { id: 'b', text: 'Neither exists at all yet — both are still early-stage proposals with unstable syntax.' },
        { id: 'c', text: 'Both proposals reached Stage 4, but availability in the actual runtime the code executes on is a separate question from proposal stage — check the target engine, or plan for a polyfill/transform, before depending on either.' },
      ],
      correctChoiceId: 'c',
      explanation:
        'Reaching Stage 4 means TC39 finalized the design and it will ship — it does not mean every runtime already has it. `Temporal` needs a polyfill (`@js-temporal/polyfill`) or a sufficiently new engine; `using`/`await using` needs either a sufficiently new engine or a compiler transform (TypeScript downlevels it) — and on Node 22 specifically, neither runs natively without one of those. Stage and shipping status are two different facts, and mixing them up is the most common way this kind of "is it safe to use yet" question goes wrong.',
    },
  ],
};
