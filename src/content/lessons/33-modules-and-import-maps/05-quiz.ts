import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'Module `store.mjs` does `export let count = 0` and later reassigns it inside a function. Module `a.mjs` does `import { count } from "./store.mjs"` and later, after that reassignment has run, reads `count`. A CJS file does the CommonJS equivalent: `const { count } = require("./store.cjs")` where `store.cjs` does `module.exports.count = 0` and reassigns `module.exports.count` later. What does each see?',
      choices: [
        { id: 'a', text: 'Both `a.mjs` and the CJS file see the updated value — imports and requires both re-read live.' },
        { id: 'b', text: '`a.mjs` sees the updated value (a live binding); the CJS file\'s destructured `count` is stuck at the value it had when `require()` ran.' },
        { id: 'c', text: 'Neither sees the updated value — both capture a snapshot at load time.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'ESM `import` bindings are live references to the exporting module\'s binding, not copies — reading `count` in `a.mjs` after the reassignment sees the new value. CommonJS has no such mechanism: destructuring `{ count }` out of `module.exports` copies whatever primitive value was there the moment `require()` returned, and later mutations to `module.exports.count` do not reach that already-copied local variable. This is the single biggest behavioral gap between the two systems, and it is invisible until something depends on it.',
    },
    {
      id: 'q2',
      prompt:
        'An import map has `scopes: { "/admin/": { "ui-kit": "/admin-ui.js" } }` and a top-level `imports: { "ui-kit": "/ui.js" }`. A module at `https://example.com/admin/settings.js` runs `import Kit from "ui-kit"`. A module at `https://example.com/public/home.js` runs the same import. What does each resolve to?',
      choices: [
        { id: 'a', text: 'Both resolve to `/ui.js` — scopes only apply to relative specifiers, not bare ones.' },
        { id: 'b', text: '`settings.js` resolves to `/admin-ui.js` because its own URL starts with the scope\'s `/admin/` prefix; `home.js` resolves to `/ui.js` because no scope prefix matches it.' },
        { id: 'c', text: 'Both resolve to `/admin-ui.js`, since scopes always take priority over top-level imports once any scope exists in the map.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A scope applies to a specifier only when the *importing module\'s own URL* starts with that scope\'s key — the scope is not global once declared. `settings.js` is inside `/admin/`, so its lookup checks the scope\'s map first and finds a match there. `home.js` is not inside `/admin/`, so no scope applies to it at all, and it falls straight to the top-level `imports` map.',
    },
    {
      id: 'q3',
      prompt:
        'A module does `export const ready = await connectToDatabase();` at its top level, and three unrelated modules import from it (directly or transitively) to reach the rest of the app\'s entry point. What is the actual effect of that one top-level `await`?',
      choices: [
        { id: 'a', text: 'None beyond that one module — top-level await is local to the module that uses it and does not affect anything that imports it.' },
        { id: 'b', text: 'It delays the evaluation of every module that transitively imports this one, since module evaluation runs in dependency order and this module\'s evaluation is suspended until the promise settles.' },
        { id: 'c', text: 'It throws a syntax error unless every importing module also uses top-level await.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Top-level await suspends the evaluation of the module that uses it, and because ES module evaluation proceeds in dependency order, everything downstream in the graph waits for that suspension to resolve before it can finish evaluating either. The graph is still resolved statically up front (option (a) confuses "resolution" with "evaluation") — nothing about the syntax requires importers to themselves use `await` (option (c)), but they do pay the latency cost whether they know it or not.',
    },
    {
      id: 'q4',
      prompt:
        'A CJS file does `const { render } = require("some-esm-only-package")` on Node 22.12+, where `some-esm-only-package`\'s entry module itself has no top-level await, but one of the modules *it* imports does. What happens?',
      choices: [
        { id: 'a', text: 'It works fine — `require(esm)` only cares about the entry module\'s own top-level await, not its dependencies\'.' },
        { id: 'b', text: 'It throws `ERR_REQUIRE_ASYNC_MODULE`, because the async behavior of any module in the graph being required — not just the entry file — makes the whole thing unsafe to load synchronously.' },
        { id: 'c', text: 'Node silently falls back to a dynamic `import()` and returns a promise instead of the module\'s exports.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`require(esm)` fails whenever anything in the graph being loaded — the target module or anything it imports, transitively — uses top-level await, because `require()` must return synchronously and there is no safe point to suspend. It does not silently degrade to an async path (option c); it throws `ERR_REQUIRE_ASYNC_MODULE`, and the fix is to switch that one call site to a dynamic `import()`.',
    },
    {
      id: 'q5',
      prompt:
        'A package\'s `exports` field is `{ ".": { "worker": "./dist/worker.mjs", "import": "./dist/index.mjs", "default": "./dist/index.cjs" } }`. A consumer resolves with conditions `["node", "import", "default"]`, in that order. Which target does it get, and why?',
      choices: [
        { id: 'a', text: '`./dist/index.mjs`, because the consumer\'s condition list has "import" first, and the resolver matches the consumer\'s preferred order.' },
        { id: 'b', text: '`./dist/index.mjs`, because the *object\'s own key order* is what\'s checked first-match-wins, and "worker" (the first key) isn\'t in the consumer\'s condition list, but "import" (the second key) is.' },
        { id: 'c', text: '`./dist/worker.mjs`, because "worker" is listed first in the exports object regardless of whether the consumer asked for it.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Condition objects are walked in the order their keys appear *in the exports field*, not in the order the consumer lists its conditions — the consumer\'s list is just the set of conditions it is willing to accept, checked as a membership test. "worker" is skipped because it isn\'t in the consumer\'s condition set at all (option c is wrong for that reason); "import" is the first key that both appears in the object and is present in the consumer\'s conditions, so it wins over "default," which would only be reached if nothing else matched.',
    },
    {
      id: 'q6',
      prompt:
        'You\'re publishing a small utility library to npm, and it will be imported by both bundled frontend apps and by plain `node script.js` runs with no bundler at all. Which TypeScript `moduleResolution` setting should the library\'s own `tsconfig.json` use, and why?',
      choices: [
        { id: 'a', text: '`"bundler"`, since it is the newest option and always the more correct default in 2026.' },
        { id: 'b', text: '`"nodenext"`, because it models Node\'s actual resolution algorithm — including `exports` map conditions and required extensions on relative ESM specifiers — which is exactly what matters for code that has to resolve correctly with no bundler in the loop.' },
        { id: 'c', text: 'It doesn\'t matter, since `moduleResolution` only affects editor autocomplete, not what actually ships.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`"bundler"` is the right choice for application code that a bundler will always resolve — it deliberately relaxes rules (extensionless relative imports, no `exports`-map enforcement) that only matter without one. A published library that has to work under plain `node` needs `"nodenext"` specifically because it enforces the real rules a Node runtime will apply, catching a missing extension or a broken `exports` entry at compile time instead of at a consumer\'s runtime. `moduleResolution` changes which imports `tsc` accepts as valid, which is a real correctness gate, not just an editor feature (option c is wrong).',
    },
  ],
};
