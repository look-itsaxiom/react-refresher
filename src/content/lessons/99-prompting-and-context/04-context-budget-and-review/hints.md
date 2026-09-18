Do the four rules as four independent, short loops — nothing in one depends on the result
of another, so order doesn't matter and you don't need to share any extra state beyond
`blockers`, `questions`, and `score`.

---

For TODO 1, build `const implementedSet = new Set(pr.implemented)` once, then `for (const
item of pr.spec) if (!implementedSet.has(item)) { ...push a blocker mentioning `item`,
`score -= 15` }`.

---

For TODO 2, `DEPRECATED_REPLACEMENT[api]` is `undefined` for any name not in the map —
use `DEPRECATED_REPLACEMENT[api] ?? '<fallback message>'` to get a replacement string
either way, then push one blocker per entry in `pr.usesDeprecated` that includes both the
API name and that replacement text.

---

TODO 3 is a single `if`, not a loop: check both conditions (`pr.testsChanged.length > 0`
and `pr.testsAdded.length === 0`) together, and if both hold, push exactly one question
and subtract 10 once — not once per changed test.

---

TODO 4 mirrors TODO 1's shape: `for (const dep of pr.deps)` push one question naming
`dep` and subtract 5, every iteration.
