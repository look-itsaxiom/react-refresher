Start with `const doc = new DOMParser().parseFromString(html, 'text/html');` and clean `doc.body`. Everything you need to return is `doc.body.innerHTML` at the end.

---

Write a recursive `clean(node)` that iterates `Array.from(node.childNodes)` (snapshot the list first -- you're about to mutate the tree you're iterating). For each child that's an element: decide remove-entirely vs. unwrap vs. keep-and-filter, then recurse into it *before* you decide whether to unwrap it, so its children are already clean by the time you splice them into the parent.

---

Unwrapping an element means moving its children up to take its place, then removing the now-empty shell: `while (el.firstChild) node.insertBefore(el.firstChild, el); el.remove();`. Do this instead of `el.remove()` alone whenever the tag isn't in `REMOVE_ENTIRELY` but also isn't in the policy.

---

For attribute filtering, iterate `Array.from(el.attributes)` (again, snapshot first -- `removeAttribute` mutates the live collection). Check `name.startsWith('on')` before checking the allowlist, so an `on*` attribute is always stripped even if a policy mistakenly allowed it.

---

For `href`/`src` validation: `new URL(value, 'https://example.invalid')` inside a try/catch. If it throws, or `url.protocol` isn't `'http:'`, `'https:'`, or `'mailto:'`, call `el.removeAttribute(name)` for that one attribute -- don't remove the whole element.

---

Full shape:

```ts
const REMOVE_ENTIRELY = new Set(['script', 'style', 'iframe', 'object', 'embed']);
const SAFE_SCHEMES = new Set(['http:', 'https:', 'mailto:']);

function isSafeUrl(value: string): boolean {
  try {
    return SAFE_SCHEMES.has(new URL(value, 'https://example.invalid').protocol);
  } catch {
    return false;
  }
}

function clean(node: Node, policy: SanitizePolicy): void {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    const el = child as Element;
    const tag = el.tagName.toLowerCase();

    if (REMOVE_ENTIRELY.has(tag)) { el.remove(); continue; }

    clean(el, policy);

    const allowed = policy.tags[tag];
    if (!allowed) {
      while (el.firstChild) node.insertBefore(el.firstChild, el);
      el.remove();
      continue;
    }

    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const drop = name.startsWith('on') || !allowed.includes(name)
        || ((name === 'href' || name === 'src') && !isSafeUrl(attr.value));
      if (drop) el.removeAttribute(attr.name);
    }
    if (tag === 'a' && el.hasAttribute('target')) el.setAttribute('rel', 'noopener noreferrer');
  }
}
```

Call `clean(doc.body, policy)` then `return doc.body.innerHTML;`.
