# Render and hydrate declarative Shadow DOM

Write two pure-ish functions that model what an SSR framework does with declarative Shadow DOM
(DSD), and the manual fallback a non-parser environment (like jsdom, or a test runner) needs
because it can't parse `<template shadowrootmode>` itself.

## `renderDeclarativeShadow(tag, shadowHTML, lightHTML, options?)`

Returns the HTML string a server would emit for one custom element instance, in this exact
shape:

```html
<TAG><template shadowrootmode="MODE">SHADOW_HTML</template>LIGHT_HTML</TAG>
```

- `tag` — the element's tag name, used verbatim as the opening and closing tag.
- `shadowHTML` — a string of markup to place inside the `<template>` (the shadow root's future
  contents — style tags, structure, slots).
- `lightHTML` — a string of markup to place *after* the `</template>`, as the element's light
  DOM children (what real content flows into its slots).
- `options?.mode` — `"open"` or `"closed"`, defaulting to `"open"`.

## `hydrateDeclarativeShadow(container)`

A real browser's HTML parser turns `<template shadowrootmode="...">` into an actual shadow root
as it parses the response — but only the *streaming parser* does that. Setting `.innerHTML` on
an element to a string containing that markup does not trigger it, and jsdom doesn't implement
DSD parsing at all. This function is the manual fallback: given a `container` that already has
DSD-shaped markup somewhere inside it (an unhydrated `<template shadowrootmode="...">` sitting
as a child of its intended host, exactly the shape `renderDeclarativeShadow` produces), find
every such template, attach a real shadow root to its parent host with the matching mode, move
the template's content into that shadow root, and remove the now-empty template. Return the
number of shadow roots it created.

Calling it a second time on the same container — after the templates it found have already
been consumed — must be a safe no-op: it finds no more unhydrated templates, creates nothing,
and returns `0`.
