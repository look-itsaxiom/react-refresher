`renderDeclarativeShadow` is string concatenation — no DOM APIs involved. Build the template
literal in the exact order the prompt describes: opening tag, `<template shadowrootmode="...">`,
the shadow HTML, `</template>`, the light DOM HTML, closing tag.

---

For `hydrateDeclarativeShadow`, start from `container.querySelectorAll('template[shadowrootmode]')`
— that finds every unhydrated DSD template inside the container, however deeply nested. Convert
the result to an array before mutating the DOM in the loop (a live `NodeList` would shrink out
from under you as you remove templates).

---

For each template found: its `parentElement` is the intended shadow host. Read the mode off
`template.getAttribute('shadowrootmode')` (falling back to `"open"` for anything that isn't
exactly `"closed"`), call `host.attachShadow({ mode })`, and append a clone of `template.content`
(a `DocumentFragment`) into the new root. Then remove the template from the light DOM — that's
what makes a second call see nothing left to hydrate, without needing to track hydrated state
anywhere else.

---

Full shape, if you're stuck:

```ts
export function renderDeclarativeShadow(
  tag: string,
  shadowHTML: string,
  lightHTML: string,
  options?: { mode?: 'open' | 'closed' },
): string {
  const mode = options?.mode ?? 'open';
  return `<${tag}><template shadowrootmode="${mode}">${shadowHTML}</template>${lightHTML}</${tag}>`;
}

export function hydrateDeclarativeShadow(container: ParentNode): number {
  const templates = Array.from(
    container.querySelectorAll('template[shadowrootmode]'),
  ) as HTMLTemplateElement[];

  let created = 0;
  for (const template of templates) {
    const host = template.parentElement;
    if (!host) continue;
    const mode = template.getAttribute('shadowrootmode') === 'closed' ? 'closed' : 'open';
    const root = host.attachShadow({ mode });
    root.appendChild(template.content.cloneNode(true));
    template.remove();
    created += 1;
  }
  return created;
}
```
