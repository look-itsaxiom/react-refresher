# Validation and schemas

Every form library in the previous step eventually hands your values to *something* that decides
whether they're valid. In 2026 that something is almost always a schema library, and the schema
libraries themselves have converged on a shared interface so the form library doesn't have to
pick a favorite.

## Zod 4: faster, smaller, still the default

Zod shipped v4 as a ground-up rewrite of its internal type system. The headline numbers from the
release: roughly 14x faster string parsing, 7x faster arrays, 6.5x faster objects than Zod 3, a
core about 57% smaller, and meaningfully fewer TypeScript type instantiations — which shows up as
faster `tsc` runs in large codebases, not just faster runtime parsing. The API most of your
existing Zod code still works; the visible new pieces are `z.interface()`, which gives you
separate control over "this key is optional" (`key?:`) vs. "this value can be `undefined`"
(a distinction `z.object()` couldn't express cleanly), and `@zod/mini`, a ~1.9 KB tree-shakeable
variant of the same validators for bundle-conscious frontend code that doesn't need the fluent
chaining API.

```ts
import { z } from 'zod';

const SignupSchema = z.object({
  email: z.email('Enter a valid email'),
  age: z.number().min(18, 'Must be 18 or older'),
});

type Signup = z.infer<typeof SignupSchema>;
```

## Valibot and ArkType: the tree-shaking and type-computation alternatives

Zod isn't the only option, and the other two matter for different reasons:

- **Valibot** is built around standalone functions (`v.object({ email: v.pipe(v.string(),
  v.email()) })`) instead of chained methods, specifically so a bundler can tree-shake out every
  validator you don't use. A schema that only needs `string` and `minLength` doesn't pay for the
  bytes of Zod's entire method surface. It's the pick when bundle size for client-shipped
  validation code is the binding constraint — a public marketing site's contact form, not an
  internal admin tool.
- **ArkType** validates using TypeScript's own type syntax as runtime values (`type({ email:
  'string.email', age: 'number >= 18' })`) and does its type-checking at the type level rather
  than by inferring from chained calls, which its benchmarks show as the fastest of the three for
  both parsing and TypeScript compilation on large schemas.

None of these displaces Zod as the default; they're the answers to "Zod is too heavy for this
bundle" or "Zod is too slow to typecheck at this schema size."

## Standard Schema: one interface, any library

The problem this created: a form library, an API client, or an RPC layer that wants to accept
"a schema" had to either pick one validator and force it on every consumer, or hand-write an
adapter per library. In early 2025 the maintainers of Zod, Valibot, and ArkType published
**Standard Schema**, a small TypeScript interface — every compliant schema exposes a `~standard`
property with a `validate` function and version/vendor metadata — that any of the three (and
others: Yup, Joi, and more have added support since) implement identically. A library that types
its input as `StandardSchemaV1` accepts a schema from any of them without knowing which one it
is:

```ts
import type { StandardSchemaV1 } from '@standard-schema/spec';

async function validateWith<T extends StandardSchemaV1>(schema: T, input: unknown) {
  const result = await schema['~standard'].validate(input);
  if (result.issues) throw new Error(result.issues[0]?.message);
  return result.value;
}
```

This is why the previous concept step could show the same Zod schema plugged into both React
Hook Form's `standardSchemaResolver` and TanStack Form's `validators.onChange` unchanged — and
why tRPC, TanStack Router, and TanStack Form all accept `StandardSchemaV1` at their boundaries
instead of shipping a Zod-specific and a Valibot-specific code path each.

## Sharing schemas between client and server

Standard Schema also solves a second, older problem: keeping client and server validation in
sync. Before schema libraries, "the client checks age >= 18" and "the server checks age >= 18"
were two hand-written rules that drifted the moment one of them changed. With a schema module
that has no framework dependency, you import the *same* `SignupSchema` in a client component and
in a server function or route handler — one source of truth, validated on both sides for the
reasons they're both needed: client-side for instant feedback, server-side because the client is
never trustworthy. The `object → array of validators` micro-validator you built in the previous
exercise is the same idea at a smaller scale: extract the rule so both "show an error on blur"
and "reject the request" call the identical function.

## Error shaping and accessibility

A schema's raw error output (`result.issues`, an array of `{ message, path }`) is not something
you render directly — you fold it into a `Record<field, message>` keyed by the first path
segment, same as `validate()`'s return shape in this lesson's first exercise. Once you have a
per-field message, wire it to the input with `aria-describedby` pointing at the message
element's `id`, and set `aria-invalid="true"` on the input while the error is showing. Screen
readers announce the description when the field receives focus, not just when the error first
appears — a `role="alert"` on the message element additionally announces it the moment it's
inserted, which matters for errors that show up after a failed submit while focus is already
elsewhere. Get the association right and a sighted user and a screen-reader user get the same
information; skip it and a visually-obvious red border under the input is invisible to anyone not
looking at the screen.

## Further reading

- [Zod — v4 release notes](https://zod.dev/v4)
- [Standard Schema — specification and adopters](https://standardschema.dev/)
- [Valibot — why standalone functions](https://valibot.dev/guides/comparison/)
- [MDN — `aria-describedby`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-describedby)
