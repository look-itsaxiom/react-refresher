# Three ways to build a form in 2026

Lesson 07 covered controlled vs. uncontrolled inputs and Lesson 03 covered `useActionState` and
`useFormStatus`. This lesson is about what you reach for once a form has more than two or three
fields and real validation rules: do you stay on the platform primitives, or bring in a library?
As of September 2026 there are three live answers, and picking wrong mostly costs you migration
time later, not correctness now.

## 1. Native `<form action>` + `useActionState` + `useFormStatus`

The baseline, covered in depth in Lesson 03: a `<form action={fn}>` where `fn` receives
`FormData`, `useActionState` to hold `{ result, error }`-shaped state across submissions, and
`useFormStatus` inside a child component to read `pending` without prop drilling. No library, no
bundle cost, and it degrades gracefully — the form still works with JavaScript disabled once you
pair it with a real server action, because it's built on the platform's own form-submission
model rather than an `onSubmit` handler that calls `preventDefault()`.

This is enough for most forms: a signup form, a settings page, a single "add item" input. It
gets uncomfortable once you have cross-field validation (confirm-password, date ranges), array
fields (repeatable line items), or you want validation to run on every keystroke instead of only
on submit — none of that is what actions were designed for.

## 2. React Hook Form: uncontrolled by default, ref-driven

React Hook Form (RHF) has been the default answer for "a real form with real validation" since
before React 19 existed, and it's still current at v7. Its core bet: register each field with a
`ref` (`register('email')`), read values out of the DOM only when something needs them (on
change, on blur, or on submit, your choice), and skip the re-render-per-keystroke tax that a
naive controlled form pays. That performance story is why RHF stays relevant even though React
19 gave the platform an uncontrolled path of its own — actions solve "submit once," RHF solves
"validate live across dozens of interdependent fields without re-rendering the whole tree on
every keystroke."

Validation plugs in through `@hookform/resolvers`, which now ships a resolver for **any Standard
Schema-compliant library** (Zod, Valibot, ArkType, and others) in addition to legacy resolvers
for Yup, Joi, and superstruct. You hand `useForm` a schema; RHF calls it and maps the schema's
errors onto its own per-field error state.

```tsx
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { z } from 'zod';

const schema = z.object({ email: z.email(), age: z.number().min(18) });

function SignupForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: standardSchemaResolver(schema),
  });
  return (
    <form onSubmit={handleSubmit((data) => submit(data))}>
      <input {...register('email')} aria-invalid={!!errors.email} />
      {errors.email && <p role="alert">{errors.email.message}</p>}
      {/* ... */}
    </form>
  );
}
```

Note the `onSubmit` handler here, not `action` — RHF predates actions and manages its own
submission lifecycle. You can wire an RHF-validated payload into a server action inside that
handler, but RHF itself owns the client-side validation loop.

## 3. TanStack Form: typed, framework-agnostic, field-level subscriptions

TanStack Form reached v1 in 2024 and is the newest of the three. It takes a different bet than
RHF: instead of refs and imperative registration, each field is a typed object (`FieldApi`) with
its own subscription, so a field's own re-renders don't cascade to siblings, and the whole form's
shape is inferred from your initial values without manual generic annotations. It shares the
TanStack philosophy (Query, Table, Router) of a framework-agnostic core with thin adapters —
`@tanstack/react-form` is one binding among several — so a validation schema and form logic
written for it can move to a Solid or Vue app with the same core. Like RHF's resolvers, TanStack
Form validators accept Standard Schema directly, so the same Zod/Valibot/ArkType schema works in
either library.

```tsx
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';

function SignupForm() {
  const form = useForm({
    defaultValues: { email: '', age: 0 },
    validators: { onChange: z.object({ email: z.email(), age: z.number().min(18) }) },
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
      <form.Field name="email">
        {(field) => (
          <input
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
          />
        )}
      </form.Field>
    </form>
  );
}
```

## Decision table

| Need | Reach for |
| --- | --- |
| Few fields, submit-once, want progressive enhancement / no-JS fallback | `<form action>` + `useActionState` |
| Large form, live validation, minimizing re-renders is the priority, team already knows it | React Hook Form |
| New project, want one schema-driven form API shared across frameworks or a from-scratch typed API | TanStack Form |
| A Remix/Next.js app that leans hard on server actions and wants forms that work with JS off | Conform (see further reading) — built specifically around progressive enhancement and `FormData`, not a controlled-state model |

All three of the library options (RHF, TanStack Form, Conform) can validate with the same
Standard Schema-compliant schema — the next concept step covers what that schema layer actually
looks like in 2026.

## Further reading

- [react.dev — `<form>` reference](https://react.dev/reference/react-dom/components/form)
- [TanStack — Announcing TanStack Form v1](https://tanstack.com/blog/announcing-tanstack-form-v1)
- [react-hook-form/resolvers — supported schema libraries](https://github.com/react-hook-form/resolvers)
- [Conform — progressive enhancement for React forms](https://conform.guide/)
