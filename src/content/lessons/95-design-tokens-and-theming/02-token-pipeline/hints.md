Write a recursive `flatten` helper that walks the tree and collects `{ path: string[],
token }` pairs — a node is a token (a leaf) when it has a `$value` key, otherwise recurse
into its children with the key appended to the path.

---

Build a `Map<string, token>` keyed by dotted path (`"color.brand.500"`) once per call to
`buildTokens`, so alias lookups don't re-flatten the tree for every token. An alias value
matches `/^\{[^{}]+\}$/` — strip the braces and split on `.` to get the target path.

---

For cycle detection, thread a `Set<string>` of "paths currently being resolved" through a
recursive alias-following function. Before following `{x}`, check whether `x` is already
in the set; if it is, throw. Add the current path to the set before recursing, and you'll
catch `a → b → a` on the second visit to `a`.

---

For the CSS output, an alias token's line should reference the **immediate** target's
variable name (`var(--the-alias-target)`), not the fully-resolved literal — you only need
to *walk* the chain to validate it (cycle/dangling checks), not to *use* the walked
result in the CSS string.

---

For `toTs()`, write a separate resolver that keeps following aliases until it lands on a
non-alias token, and use that token's `$value` as the literal. This is a different code
path from the CSS one on purpose: CSS wants `var()`, TS wants the concrete value.

---

For typography, check `token.$type === 'typography'` and that `$value` is an object (not
a `{ value, unit }` dimension). Loop over a fixed list of sub-keys
(`fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`), skip any that are
`undefined` on this particular token, and emit `--<var-name>-<kebab-sub-key>`. A
`fontSize`/`letterSpacing` sub-value might itself be a dimension object — reuse your
`value + unit` formatter for those.

---

For theme blocks, don't merge the override tree into the base tree before flattening —
flatten the **override tree alone** so only the tokens the theme actually specifies get
emitted into that `[data-theme="name"]` selector. (You still need the base tree's
primitives available for alias lookups if an override itself is an alias.)

---

For `lintTokens`, the two rules are independent — a token can be missing `$type` and also
be a raw semantic value at the same time, or neither. Check both conditions on every
token you visit rather than treating them as an if/else.
