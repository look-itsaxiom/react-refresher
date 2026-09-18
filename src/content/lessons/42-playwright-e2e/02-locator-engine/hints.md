Start with `roleOf`. Check `role` attribute first, then tag name, then, for `<input>`, its `type`
attribute (defaulting to `'text'` when absent, same as the HTML spec). Accessible name is a small
helper you'll reuse from `role` and could reuse from `text`'s exact mode too: `aria-label` if set,
otherwise `textContent` run through `.replace(/\s+/g, ' ').trim()`.

---

For `locate`, treat the candidate set as a running `Element[]` you reduce the chain over. The
tricky step is `text`: compute the full matching set first (walk every descendant under `root`, or
under each current candidate, and test its normalized `textContent`), then filter that set down to
elements with no descendant *also in the set* — `matches.filter(el => !matches.some(other => other !== el && el.contains(other)))`
is the whole trick.

---

For `locator` and `filter`, remember the "or root if first step" branch every other step already
needs — you can write one small helper, `scopesFor(current, root)`, that returns `current.length >
0 ? current : [root]`, and reuse it for `role`, `text`, and `locator`.

---

For `nth`, out-of-range should produce `[]`, not throw — `candidates[index] !== undefined ?
[candidates[index]] : []` handles both the positive and negative-index-as-empty case cleanly since
this exercise only exercises non-negative indices.

---

`strictOne` is three lines: call `locate`, check `.length`, throw or return. The error message
must contain the literal words `strict mode violation` and `resolved to N elements` (with the
actual count) — the checks match on that substring, not on any particular Error subclass.
