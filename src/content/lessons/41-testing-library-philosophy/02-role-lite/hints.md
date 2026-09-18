Start with a small lookup table for tag name → implicit role (`NAV` → `navigation`, `MAIN` →
`main`, `UL`/`OL` → `list`, `LI` → `listitem`, `DIALOG` → `dialog`), then handle the tags that need
extra logic separately: `A` (only with `href`), `H1`–`H6` (also compute a level), `INPUT` (branch
on `type`), `SELECT`. An element's *resolved* role is `element.getAttribute('role') ??
implicitRoleFor(element)`.

---

For hidden exclusion, walk up from the element with `element.closest` or a manual `while (node)`
loop, checking `node.hasAttribute('hidden')` and `node.getAttribute('aria-hidden') === 'true'` at
every level — a hidden ancestor hides everything inside it, not just itself.

---

For the accessible name, write one function that tries each source in order and returns as soon as
one produces a non-empty string:

```ts
function computeName(el: Element): string {
  const labelledby = el.getAttribute('aria-labelledby');
  if (labelledby) {
    const text = labelledby
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
      .filter(Boolean)
      .join(' ');
    if (text) return text;
  }
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel.trim();
  // ...then <label for>, then a wrapping <label> via el.closest('label'), then el.textContent
}
```

---

Query every element in the container with `container.querySelectorAll('*')`, filter to the ones
whose resolved role matches (and aren't hidden), then filter again by name/level if those options
were passed. `Array.from(...).filter(...)` on the full set is simpler to get right than trying to
be clever about which tags to check.

---

The throwing logic is the last step and the easiest to get wrong under time pressure: check
`matches.length === 0` and `matches.length > 1` *before* returning `matches[0]`, and put the role
(and name, if given) in both error messages so a caller reading the failure knows what to fix.
