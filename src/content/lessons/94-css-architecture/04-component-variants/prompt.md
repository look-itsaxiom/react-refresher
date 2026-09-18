# Build a component-variant architecture

Lesson 18 built a `cva`-style variant builder for a single component. Here you'll build the
general-purpose pieces a design system uses to compose class strings deterministically
across *any* component, plus the conflict-resolution step a tool like `tailwind-merge`
does for you.

## `createComponent(config)`

```ts
type VariantMap = Record<string, Record<string, string>>;
type CompoundRule = { when: Record<string, string>; className: string };
type ComponentConfig = {
  base: string;
  variants: VariantMap;
  compound?: CompoundRule[];
  defaults?: Record<string, string>;
};
type ComponentProps = Record<string, string | undefined> & { className?: string };

function createComponent(config: ComponentConfig): (props?: ComponentProps) => string;
```

Returns a function that composes a class string:

1. Start with `config.base`.
2. For each key in `config.variants`, **in the order the keys were defined**, resolve a
   value: `props[key] ?? config.defaults?.[key]`. If that value is a key in
   `config.variants[key]`, append its class string. If the resolved value doesn't exist in
   that variant's map (an unknown value, or no default and no prop), append nothing —
   don't throw.
3. After all variants, walk `config.compound ?? []` in array order. A rule applies when
   *every* key/value pair in `rule.when` matches the value that was resolved for that
   variant in step 2 (comparing against the resolved value, not the raw prop — so a
   compound rule can match against a default). Append `rule.className` for every rule that
   applies.
4. Finally, if `props.className` is set, append it as-is.

Join everything with single spaces. The output must be deterministic: calling the returned
function twice with the same props produces byte-identical strings.

## `dedupeUtilities(className, conflicts)`

```ts
function dedupeUtilities(className: string, conflicts: Record<string, string[]>): string;
```

`conflicts` groups mutually-exclusive utility classes under a group name, e.g.
`{ padding: ['p-2', 'p-3', 'p-4', 'p-8'] }`. Split `className` on whitespace. For each
conflict group, if more than one of its classes is present, keep only the **last one that
appears** in the string and drop the earlier ones; classes that aren't part of any group
pass through untouched. This mirrors the core idea behind `tailwind-merge`: the class
written last wins, so `className="p-3 p-8"` (a default merged with an override) collapses
to `"p-8"`.

## `<Button>`

Wire both together into a `Button` component with `intent` (`'primary' | 'secondary' |
'danger'`, default `'primary'`) and `size` (`'sm' | 'md' | 'lg'`, default `'md'`) variants,
a compound rule that adds emphasis classes only when `intent` is `'danger'` **and** `size`
is `'lg'`, and a padding conflict group so a caller-supplied `className` with its own
padding utility replaces the size default instead of fighting it.
