Start with a `switch (node.kind)`. The `'text'` case is one line: return
`node.value`.

---

For `'server'`, don't try to build a payload shape yourself — call
`node.render(node.props ?? {})` to get the `TreeNode` it produced, then call
`renderToPayload` again on *that*. Because `renderToPayload` is recursive,
this also handles a server component that renders another server component:
you just keep calling `render` and recursing until you hit a `'host'`,
`'client'`, or `'text'` node.

---

For `'client'` and `'host'`, validate props before building the return
value, not after — loop over `Object.entries(node.props ?? {})` and call
`isSerializable` on each value, throwing the described error on the first
bad one. Then, for `'host'`, map every entry of `node.children ?? []`
through `renderToPayload` to build the `children` array.

---

A `default` branch with `const _exhaustive: never = node;` isn't required,
but it's a good check while you're implementing: if TypeScript complains
there, you're missing a case.
