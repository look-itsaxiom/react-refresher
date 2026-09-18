# Build a miniature RSC payload renderer

This models what a framework does when it turns your component tree into an
RSC ("Flight") payload — again, a simplified stand-in, not the real
serializer. You're given a tiny in-memory tree shape (`TreeNode`) instead of
real JSX, so the exercise stays a pure function you can test directly.

`TreeNode` has four kinds:

- `{ kind: 'text', value }` — a leaf string.
- `{ kind: 'host', tag, props?, children? }` — a DOM-like element (`div`,
  `button`, ...).
- `{ kind: 'server', render, props? }` — a Server Component: `render(props)`
  returns the `TreeNode` it produced.
- `{ kind: 'client', id, props? }` — a `'use client'` component, identified
  by a string id (standing in for a module reference).

Implement `renderToPayload(node: TreeNode): Payload`:

1. **`'text'`** → return the string.
2. **`'server'`** → **inline it**: call `node.render(node.props ?? {})` to
   get the `TreeNode` it returned, then recurse into `renderToPayload` on
   that result. Nothing about the server component — its existence, its
   props — should appear anywhere in the final payload; only what it
   rendered does. Handle a server component that renders another server
   component (recurse until you hit something else).
3. **`'client'`** → don't recurse into it (there's nothing to render on the
   server) — instead return a placeholder reference:
   `{ $$typeof: 'client-ref', id: node.id, props: node.props ?? {} }`.
   Since these props are about to cross into the payload, validate them
   first with the given `isSerializable` helper; if any prop fails, throw
   `new Error('Cannot serialize prop "<name>" for client reference "<id>"')`.
4. **`'host'`** → validate its props the same way (throw
   `new Error('Cannot serialize prop "<name>" on host tag "<tag>"')` on
   failure), then return
   `{ type: node.tag, props: node.props ?? {}, children: [...] }` with every
   child recursively converted through `renderToPayload`.

`isSerializable` is already implemented in the starter — use it, don't
reimplement it.
