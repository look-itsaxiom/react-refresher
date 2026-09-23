# Language features that changed how we write React

Most of what makes React code "feel modern" in 2026 isn't a React feature at all — it's
TypeScript catching up to patterns people were already writing.

## `satisfies` for config objects and route tables

Before `satisfies`, you had two bad options for a typed config object: annotate it with
the target type and lose the literal types (`const routes: Record<string, Route> = {
home: { path: '/' } }` — now `routes.home.path` is just `string`), or don't annotate it
and lose the validation (a typo in a key is silently allowed). `satisfies` checks the
value against a type without changing its inferred type:

```ts
type Route = { path: string; title: string };

const routes = {
  home: { path: '/', title: 'Home' },
  billing: { path: '/billing', title: 'Billing' },
} satisfies Record<string, Route>;

routes.billing.path; // still the literal '/billing', not widened to string
```

If you misspell a field or forget one, TypeScript flags it at the `satisfies` line,
exactly like an annotation would — but `routes` keeps its precise, literal-typed shape
for everything downstream (autocomplete on `routes.billing`, a union of `keyof typeof
routes` for a nav component's `Route` prop). This is the idiomatic replacement for `as
const` used purely for validation; use `as const` on its own when you want literal types
and don't need shape-checking, and `satisfies` when you want both.

## Template literal types and `as const`

Template literal types build string unions the same way template literals build
strings:

```ts
type Size = 'sm' | 'md' | 'lg';
type Variant = 'solid' | 'outline';
type ButtonClass = `btn-${Variant}-${Size}`; // 'btn-solid-sm' | 'btn-outline-lg' | ...
```

Combined with `as const`, this turns a plain array of strings into a literal union
without hand-writing it twice:

```ts
const sizes = ['sm', 'md', 'lg'] as const;
type Size = (typeof sizes)[number]; // 'sm' | 'md' | 'lg'
```

`sizes` stays iterable at runtime (for building a `<select>`'s options, say) while `Size`
gives you the matching type for props — one source of truth instead of an array and a
union that can drift apart.

## Generics in components, and extracting prop types

A component that's generic over its data — a `Select<T>`, a `Table<Row>` — is written
the same way a generic function is, with one TSX-specific wrinkle: `<T,>` needs the
trailing comma (or a `T extends unknown` constraint) so the parser doesn't read the angle
bracket as the start of a JSX element:

```tsx
function Select<T,>({ items, getLabel }: { items: T[]; getLabel: (item: T) => string }) {
  return <select>{items.map((item, i) => <option key={i}>{getLabel(item)}</option>)}</select>;
}
```

Conditional types with `infer` let you pull a type back out of something instead of
writing it twice. Getting a component's props type without importing the props type
directly:

```ts
type PropsOf<C> = C extends (props: infer P) => unknown ? P : never;
type ButtonProps = PropsOf<typeof Button>;
```

`ComponentProps<typeof Button>` (from concept one) does this same job for components
specifically and is almost always what you want in application code; `infer` is what
`ComponentProps` is built from, and you'll reach for it directly when extracting a type
from something that isn't a component — a return type, a specific argument, an array's
element type.

`NoInfer<T>` blocks a type parameter from being inferred from one particular argument,
which matters for APIs like a typed reducer where the same generic appears in two
places and you want only one of them driving inference:

```ts
function useToggleState<T>(value: T, options: { on: T; off: NoInfer<T> }) { /* ... */ }
```

Without `NoInfer`, TypeScript would infer `T` from both `on` and `off` and could widen it
unexpectedly if they don't match exactly; `NoInfer` says "this position doesn't get a
vote."

## `using` declarations

TypeScript 5.2 added `using` (and `await using`) for deterministic cleanup — a value
whose `[Symbol.dispose]()` method runs automatically at the end of the block, success or
error:

```ts
function process() {
  using file = openFile('data.csv'); // file[Symbol.dispose]() runs when process() returns
  return parse(file);
}
```

It's more common in Node tooling and resource management than in component code today —
React's own cleanup story is `useEffect`'s return function — but you'll see it in
scripts, test setup, and libraries that manage connections or subscriptions.

## TypeScript 7 and `tsgo`

TypeScript 7 is the native port of the compiler and language service, rewritten from
JavaScript to Go for speed — Microsoft's own benchmarks put full project type-checking
roughly an order of magnitude faster than the JS compiler on large codebases. What
*didn't* change: the type system's semantics. A program that type-checks under the
classic `tsc` type-checks the same way under the native compiler; this is a
reimplementation of the checker, not a new language. In practice you'll meet it as the
`tsgo` CLI (or the `@typescript/native-preview` package), often wired into CI for the
type-checking step specifically because it's fast enough to run on every push without
becoming the bottleneck; editor tooling (the language service powering hover, go-to-
definition, and rename) is migrating to the native implementation on its own timeline,
so check your editor's current TypeScript version if something behaves differently
there than on the command line.

A few flags shape how exported code type-checks and compiles, independent of which
compiler you use:

- **`isolatedDeclarations`** requires exported functions and values to have explicit
  types, so their `.d.ts` output can be generated file-by-file, in parallel, without the
  checker inferring across the whole project first. It matters most for library and
  design-system packages built with tools that lean on this for speed; app code doesn't
  need it.
- **`verbatimModuleSyntax`** (paired with `import type` / `export type`) makes type-only
  imports explicit in the source, so a transpiler that only strips types — rather than
  fully type-checking — knows exactly which imports to erase.
- **`erasableSyntaxOnly`** forbids the handful of TypeScript constructs that require
  real code generation, not just erasure (`enum`, constructor parameter properties,
  `namespace` with runtime members), so a plain strip-the-types step is guaranteed
  correct. This is exactly what lets Node run `.ts` files without a build step, and it's
  the same reason this course's sandbox can run your exercise code through a
  strip-only transform instead of the full type checker.

## Linting: type-aware rules vs. speed

`typescript-eslint`'s type-aware rules (`no-floating-promises`,
`no-unnecessary-condition`, and similar) need a real type checker behind them, which
makes them by far the most useful category of lint rule and also the slowest — they
scale with project size the way `tsc` does. `oxlint`, written in Rust, runs the syntactic
rules (unused variables, hooks rules, most correctness checks) in a fraction of the
time but has no type information to work with. The common setup in a fast repo is
`oxlint` on every save and every CI job for the bulk of the ruleset, with
`typescript-eslint`'s type-aware rules run less often — a pre-merge check or a scheduled
job — specifically because they're the ones worth waiting for.

## Further reading (optional)

- [TypeScript Handbook — `satisfies`](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#the-satisfies-operator)
- [TypeScript Handbook — Template Literal Types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html)
- [TypeScript release notes — `using` declarations](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html#using-declarations-and-explicit-resource-management)
- [TypeScript blog — a 10x faster TypeScript](https://devblogs.microsoft.com/typescript/typescript-native-port/)
