# Types as a programming language

You already know generics as `Array<T>` and interfaces as shapes. What's changed since you
last paid close attention is how much *computation* happens at the type level: conditional
types, template literals, and mapped types turn TypeScript's type checker into a small
functional language that runs at compile time. This step is a tour of that language, aimed
at reading and writing types that transform other types, not just describe values.

## Generics with constraints and defaults

A constraint (`extends`) narrows what a type parameter can be; a default fills it in when
the caller doesn't supply one:

```ts
type Paginated<T, Meta extends object = { page: number }> = {
  items: T[];
  meta: Meta;
};

type Basic = Paginated<string>; // meta: { page: number }
```

`const` type parameters (TS 5.0+) are the other half of the generics story: normally, when
you pass a literal array or object to a generic function, TS widens it before inferring —
`f(['a', 'b'])` infers `T = string[]`, not the tuple `['a', 'b']`. Marking the parameter
`const` keeps the literal:

```ts
function tuple<const T extends readonly unknown[]>(items: T): T {
  return items;
}
const t = tuple(['a', 'b']); // readonly ["a", "b"], not string[]
```

You reach for this whenever downstream types need to key off the exact literal values —
route tables, action maps, anything where "an array of strings" is too wide.

## Conditional types, `infer`, and distributivity

A conditional type is an `if` for types: `T extends U ? X : Y`. `infer` captures a piece of
`T` you don't know ahead of time — it's how `ReturnType<F>` and `Awaited<P>` work:

```ts
type UnwrapPromise<T> = T extends Promise<infer V> ? V : T;
type A = UnwrapPromise<Promise<string>>; // string
type B = UnwrapPromise<number>;          // number
```

The trap is **distributivity**: when the checked type is a *naked* type parameter and you
feed it a union, the conditional applies to each member separately, not to the union as a
whole:

```ts
type ToArray<T> = T extends unknown ? T[] : never;
type X = ToArray<string | number>; // string[] | number[], not (string | number)[]
```

Wrap either side in a tuple (`[T] extends [unknown] ? ... : ...`) to opt out and check the
union as one type — you want this when you're deciding something about the union itself
(is it `never`? does it include `undefined`?), not transforming each member.

## Template literal types

Template literal types let you pattern-match and build string types the same way you build
string values:

```ts
type EventName<T extends string> = `on${Capitalize<T>}`;
type Change = EventName<'change'>; // "onChange"

type ExtractParams<Path extends string> =
  Path extends `${infer _Start}:${infer Param}/${infer Rest}`
    ? { [K in Param | keyof ExtractParams<Rest>]: string }
    : Path extends `${infer _Start}:${infer Param}`
      ? { [K in Param]: string }
      : Record<string, never>;

type P = ExtractParams<'/users/:id/posts/:postId'>; // { id: string; postId: string }
```

This is the exact shape of typed router libraries (and the next exercise): the route
string is the single source of truth, and the params type falls out of it instead of being
hand-written and drifting out of sync.

## Mapped types, key remapping, and variance

A mapped type produces an object type by iterating a union of keys. `as` remaps each key,
and `+`/`-` toggle modifiers:

```ts
type Setters<T> = {
  [K in keyof T as `set${Capitalize<string & K>}`]: (value: T[K]) => void;
};
type S = Setters<{ name: string }>; // { setName: (value: string) => void }

type Mutable<T> = { -readonly [K in keyof T]: T[K] };
type ReadonlyDeep<T> = { readonly [K in keyof T]: T[K] };
```

Recursive types (like `ExtractParams` above, or a `DeepReadonly<T>`) work as long as they
make progress toward a base case each call; TypeScript enforces an instantiation depth
limit and will error with "Type instantiation is excessively deep" if a recursive type
doesn't converge — usually a sign the recursion is missing a base case, not that the depth
limit needs raising.

`in`/`out` variance annotations document (and let the checker verify) how a generic
interface behaves under subtyping — `in` for parameter-only ("consumer") positions, `out`
for return-only ("producer") positions:

```ts
interface Source<out T> { get(): T }        // read-only: covariant
interface Sink<in T> { push(value: T): void } // write-only: contravariant
```

Most app code never writes these by hand, but they matter once you're authoring generic
library types and want TypeScript to reject `Source<Dog>` being used where `Source<Cat>`
is expected, without relying on structural luck.

## `satisfies`, `as const`, and `NoInfer`

Three different jobs, often confused:

- **Annotation** (`const x: T = ...`) checks *and* widens the variable to `T`.
- **`as const`** freezes literals (no widening, `readonly`), independent of any target type.
- **`satisfies T`** checks against `T` without changing the expression's inferred type —
  you keep the narrow literal type *and* get validation.

```ts
const config = {
  mode: 'dark',
  retries: 3,
} satisfies Record<string, string | number>;
config.mode; // "dark", not string — satisfies doesn't widen
```

`NoInfer<T>` (TS 5.4+) blocks a type parameter from being inferred from a specific
position, so it's only settled by other arguments — useful when a "default value" argument
would otherwise be allowed to *expand* the inferred type instead of merely matching it:

```ts
function pickDefault<T>(value: T, fallback: NoInfer<T>): T {
  return value ?? fallback;
}
```

## `unknown`, `never`, and exhaustiveness

`unknown` is the type-safe `any` — anything is assignable to it, but you can't do anything
with it until you narrow. `never` is the empty type: nothing is assignable to it (except
`never` itself), which is exactly what you want for "this branch is unreachable":

```ts
function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}

type Shape = { kind: 'circle'; r: number } | { kind: 'square'; side: number };
function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle': return Math.PI * shape.r ** 2;
    case 'square': return shape.side ** 2;
    default: return assertNever(shape); // compile error if a case is missing
  }
}
```

Add a third variant to `Shape` without a matching `case`, and `assertNever` stops
compiling — the exhaustiveness check turns a runtime bug into a build failure.

**Branded types** use the same "nothing is really assignable" idea to stop structurally
identical primitives from being mixed up:

```ts
type UserId = string & { readonly __brand: 'UserId' };
type PostId = string & { readonly __brand: 'PostId' };
declare function getUser(id: UserId): void;
declare const postId: PostId;
getUser(postId); // error: PostId is not assignable to UserId
```

Two `string` values are otherwise interchangeable to the checker; the brand makes a
mix-up a type error instead of a runtime bug three services away from where it started.

## Testing types, not just values

None of this is worth much if you can't verify it — and a runtime assertion library can't
check a type. The pattern used across `expect-type`, `tsd`, and Vitest's `expectTypeOf` all
boil down to the same trick: a type-level equality check that only compiles when true.

```ts
type Expect<T extends true> = T;
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

type _test = Expect<Equal<ExtractParams<'/x/:id'>, { id: string }>>;
```

`Equal` (not simple mutual `extends`) is the standard trick for catching things plain
`extends` checks miss, like the difference between `unknown` and `any`. Vitest ships
`expectTypeOf` for the same purpose with a friendlier API
(`expectTypeOf(fn).returns.toEqualTypeOf<string>()`), and `// @ts-expect-error` above a
line is a type-level test in its own right: it fails to compile if the line *doesn't*
error, so it catches a type getting accidentally more permissive over time.

## Further reading

- [TypeScript Handbook: Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)
- [TypeScript Handbook: Template Literal Types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html)
- [TypeScript 5.0 release notes: `const` type parameters and variance annotations](https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/)
- [Vitest: Type Testing](https://vitest.dev/guide/testing-types.html)
