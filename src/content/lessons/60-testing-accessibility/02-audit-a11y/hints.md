Every remaining rule follows the same shape as the `image-alt` example: loop over
`root.querySelectorAll('*')`, skip anything `isHidden` (except `aria-hidden-focus`, which is
specifically about hidden-but-focusable elements), and push a `Violation` when the condition
matches. Write one small helper per "is this element a button-like thing / form control / link"
question rather than repeating tag checks inline — it makes `button-name`, `label`, `region`,
and `aria-hidden-focus` all reuse the same predicates.

---

`heading-order` is the one rule that isn't a pure per-element filter — it needs to remember the
previous heading's level as you walk. Keep a `let previousLevel: number | null = null` outside
the loop, only compare (and only flag) once you've seen a first non-hidden heading, and update
`previousLevel` after checking every heading, not just the ones that violate.

```ts
let previousLevel: number | null = null;
for (const el of all) {
  const match = /^H([1-6])$/.exec(el.tagName);
  if (!match || isHidden(el)) continue;
  const level = Number(match[1]);
  if (previousLevel !== null && level > previousLevel + 1) {
    // push a violation
  }
  previousLevel = level;
}
```

---

`aria-hidden-focus` is the odd one out: every other rule calls `isHidden(el)` and skips when it's
true. This rule is *looking for* elements that are hidden this specific way, so it should never
call `isHidden` — instead check `el.closest('[aria-hidden="true"]')`, which returns a truthy
match whether the `aria-hidden="true"` is on `el` itself or an ancestor.

---

For `region`, `el.closest('main, nav, header, footer, aside')` (a single call with a comma-
separated selector) checks all five landmark tags in one line, walking up from `el` — no
violation if it finds any of them anywhere above.

---

For `list`, don't walk ancestors — the rule is specifically about the *direct* parent:
`el.parentElement?.tagName !== 'UL' && el.parentElement?.tagName !== 'OL'`. A `<li>` nested two
levels inside a `<div>` inside a `<ul>` would still violate a real audit's intent as much as one
sitting bare at the top level, but keeping this one to "direct parent" matches what the fixture
tests and keeps the rule simple.
