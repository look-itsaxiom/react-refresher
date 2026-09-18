Every remaining `mutate` rule follows the same shape as the two examples: scan `masked` with
`.matchAll(regex)`, and for each match call `add(description, m.index, m.index + m[0].length,
replacement)`. For `+`/`-`, match the compound operators first in the same alternation so they
"win" over the bare operator at the same position, then skip them:

```ts
for (const m of masked.matchAll(/\+\+|--|\+=|-=|\+|-/g)) {
  if (m[0].length === 2) continue; // ++, --, +=, -= — leave these alone
  const to = m[0] === '+' ? '-' : '+';
  add(`changed ${m[0]} to ${to}`, m.index, m.index + m[0].length, to);
}
```

---

For the numeric literal, use a non-global regex's `.exec(masked)` (not `.matchAll`) so you only
get the first match, with its `.index`:

```ts
const first = /\d+(\.\d+)?/.exec(masked);
if (first) {
  const to = String(Number(first[0]) + 1);
  add(`changed numeric literal ${first[0]} to ${to}`, first.index, first.index + first[0].length, to);
}
```

For the return-value mutator, count `\breturn\b` occurrences in `masked` first (`.matchAll(/\breturn\b[^;\n]*;?/g)`
collected into an array) — only proceed if that array has exactly one entry, and use its `.index`
and matched length the same way.

---

`mutationScore` is mostly wiring: `mutate(fnSource)` gives you the mutants, `extractFunctionName`
gives you the name to `return` from inside `new Function`. The key structural point is two
separate failure modes that both mean "killed" — a compile-time throw (wrap the `new Function(...)()`
call itself in try/catch) and a test that returns `false` or throws while running (wrap each
`test(fn)` call too, or let one outer try/catch around the whole per-mutant loop body do both).
Don't run any tests once you already know a mutant failed to compile — there's no function to
call.

---

`refactorPlan` is a straight list of conditionals — no mutation logic at all. Build `steps` as an
array, `push`ing conditionally in the order the prompt lists the rules, with the two fixed steps
(`apply the ${change.kind} change`, `open a PR for review`) always present at the end in that
order. Build `gates` starting from `['typecheck', 'tests']` and push the two conditional gates
after.
