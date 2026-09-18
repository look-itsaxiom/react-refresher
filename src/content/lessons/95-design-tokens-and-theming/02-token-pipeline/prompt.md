Build a miniature Style Dictionary: a function that takes a nested DTCG-shaped token
tree and emits CSS custom properties, plus a linter that catches two common token-hygiene
mistakes.

## `buildTokens(dtcg, options?)`

```ts
type BuildTokensOptions = {
  prefix?: string;
  themes?: Record<string, DtcgTree>; // per-theme override trees
};
function buildTokens(dtcg: DtcgTree, options?: BuildTokensOptions): {
  css: string;
  toTs(): string;
};
```

- **Flatten** the tree: a nested object whose leaf is a token object (has `$value`)
  becomes a CSS custom property named by joining the path with `-`, prefixed if
  `options.prefix` is set. `{ color: { brand: { 500: { $value: '#3b82f6', $type: 'color' } } } }`
  with `prefix: 'tc'` becomes `--tc-color-brand-500`.
- **Resolve aliases.** A `$value` of `"{color.brand.500}"` references another token by
  path. In the CSS output, an alias stays a reference — `var(--tc-color-brand-500)` — not
  a copied literal, so a theme override of the primitive still cascades into everything
  that aliases it. Detect alias cycles (`a` → `b` → `a`) and `throw` an `Error` when you
  find one, and throw if an alias points at a path that doesn't exist.
- **Composite types.** A `dimension` value is `{ value: number; unit: string }` and
  becomes `${value}${unit}` (e.g. `4px`). A `typography` value is an object with some of
  `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing` — emit **one CSS
  custom property per sub-key**, named `<token-var-name>-<kebab-case-subkey>` (so
  `--tc-text-heading-font-size`, `--tc-text-heading-font-weight`, ...). A `fontSize` or
  `letterSpacing` sub-value may itself be a `dimension` object; format it the same way.
- **Themes.** For each `[name, overrideTree]` in `options.themes`, emit a
  `[data-theme="name"] { ... }` block containing only the custom properties present in
  that theme's override tree (same flattening and alias rules as the base tree). Emit the
  base tree first as `:root { ... }`, then one block per theme, in the order the object's
  keys were given.
- **`toTs()`** returns a string of TypeScript source. Unlike the CSS output, aliases here
  should be **fully resolved to their literal value** (follow the alias chain to the
  concrete `$value`) — export something like
  `export const tokens = { "--tc-color-brand-500": "#3b82f6", ... } as const;`. Composite
  tokens are flattened the same per-sub-key way as in the CSS output.

## `lintTokens(tree)`

```ts
type LintIssue = { path: string; rule: 'raw-value-in-semantic' | 'missing-type'; message: string };
function lintTokens(tree: DtcgTree): LintIssue[];
```

Walk every token in the tree (regardless of `options` — this only takes the raw tree) and
flag:
- `missing-type`: any token whose object has no `$type`.
- `raw-value-in-semantic`: a token whose path starts with `semantic` and whose `$value`
  is **not** an alias (doesn't match `{...}`). Semantic tokens should always point at a
  primitive.

`path` in each issue is the dotted path to the offending token (`"semantic.color.bg"`).

The starter's `App` renders whatever `buildTokens` produces for a small example tree —
enough to see your CSS text on screen while you build it, though the checks grade the
functions directly, not the rendered page.
