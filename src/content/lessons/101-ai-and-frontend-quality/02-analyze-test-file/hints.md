Start with the per-test loop. Map over `segments`, and for each `{ marker, text }`, build up a
`smells: TestSmell[]` array by testing `text` (and `marker.modifier`) against each provided regex
or condition, in the order listed in the prompt. Every rule is an independent `if` — a test can
have any number of smells at once.

```ts
const tests: AnalyzedTest[] = segments.map(({ marker, text }) => {
  const smells: TestSmell[] = [];
  if (marker.modifier === 'skip') smells.push('skipped');
  // ...the rest of the rules, each its own `if`
  return { name: marker.name, smells };
});
```

---

`mocks-subject` doesn't depend on the test's own text at all — it only depends on the file-level
`mocksSubject` boolean you already have. So its check is just `if (mocksSubject) smells.push(...)`,
independent of whatever else is true about that particular test.

---

For `summary`, you're building a plain array of strings — push a message conditionally, the same
way you'd push a smell, just onto a different array and gated on the file-level booleans
(`mocksSubject`, `!hasNegativeCase`) instead of per-test ones. The checks only look for keywords
(`vi.mock`, `mocking`, or similar) in these messages, not an exact string, so phrase them however
reads clearly to you as long as the concept is unambiguous.

---

For the score, loop over the `tests` array you just built and use `t.smells.includes('tautology')`
(and so on) to apply each per-test deduction, then apply the two file-level deductions
(`mocksSubject`, `!hasNegativeCase`) once each, outside that loop — not once per test, even though
`mocks-subject` shows up in every test's `smells` array. Clamp the final result with
`Math.max(0, score)`.
