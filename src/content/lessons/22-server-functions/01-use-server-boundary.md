## Server Functions are an RPC boundary, not a fancy `onClick`

A Server Function is a reference the client holds to code that only runs on
the server. You mark a module or a function with the `'use server'`
directive, and the bundler does the rest: it extracts the function, gives it
a stable id, wires up an HTTP endpoint for it, and replaces the client's copy
with a thin stub that calls that endpoint and awaits the result. Calling
`createTodo(formData)` from a client component looks like calling a local
function. It compiles to a network request.

This sandbox has no RSC runtime, so nothing here actually crosses a network
boundary. The `@server/*` modules you've used since lesson 3 (`@server/todos`
and friends) already model the shape of a Server Function: an async function
that "does something on the server" and returns a plain, serializable value.
This lesson makes the model explicit and adds the parts a fake module
usually skips -- validation, authentication, and revalidation.

### Three ways to call one

**From a `<form action>`.** This is the case with built-in progressive
enhancement: React serializes the form's fields into a `FormData`, submits it
to the function's endpoint, and — because it's a real `<form>` — the
submission still works if JavaScript hasn't loaded yet or failed to load at
all (the framework renders a real HTML form post as the fallback).

```tsx
<form action={createTodoAction}>
  <input name="title" />
  <button>Add</button>
</form>
```

**From `useActionState`.** The pattern from lesson 3 still applies: wrap the
Server Function so you get back a `[state, formAction, isPending]` triple,
where `state` is whatever the function last returned. This is how you attach
validation errors or a fresh list to the UI without a separate `useState`.

```tsx
const [state, formAction] = useActionState(createTodoAction, initialState);
```

**From an event handler or `startTransition`.** Not everything is a form.
A "favorite" button, a drag-and-drop reorder, or a debounced autosave calls
the Server Function directly, usually wrapped in `startTransition` so React
can keep the UI responsive while it's pending:

```tsx
function FavoriteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(async () => {
        await toggleFavorite(id);
      })}
    >
      ★
    </button>
  );
}
```

There's no automatic pending state or serialized `FormData` here — you own
the arguments and the transition.

### Arguments, return values, and what can cross

Arguments and return values both have to survive serialization, the same
rule the previous lesson covered for the client/server boundary: plain
objects, arrays, strings, numbers, `Date`, `Map`/`Set`, and — for arguments
specifically — `FormData`. No functions, no class instances, no React
elements. A Server Function can also be *bound* with extra arguments ahead
of time (`createTodo.bind(null, listId)`), which is how you attach context
like an id to a function passed down as a prop without threading it through
every intermediate component.

Return values matter more than they first appear to: whatever the function
returns becomes the new `state` in `useActionState`, so its shape is your
API contract with the UI. A Server Function should never throw an
unhandled error across the boundary — catch what can fail and return a
typed result (`{ ok: false, errors }` or similar) instead. An uncaught
throw either surfaces as an opaque "something went wrong" message in
production or, worse, leaks a stack trace.

### The security model: every Server Function is a public endpoint

This is the part a tutorial-sized example glosses over and a real one can't.
Once a function has `'use server'` on it, it is reachable by anyone who can
construct the right request — not just from the UI you wrote, and not only
while that UI is mounted. That means:

- **Validate every argument** as if it came from `curl`, because it can.
  Never trust a hidden form field, a client-supplied id, or anything else
  the request claims about itself.
- **Authenticate and authorize inside the function**, from the server's own
  session (a cookie, a signed token), never from something the client
  passed in. A hidden `<input name="userId">` is not an identity check —
  it's a suggestion the client is free to ignore.
- **Watch what a closure captures.** A Server Function defined inline inside
  a component closes over whatever's in scope, and in frameworks like
  Next.js those closed-over values get sent to the client so the bound
  function can be reconstructed on the next call — encrypted, but still
  round-tripped through the browser. This is sometimes called the
  "poisoned closure" problem: if the closure captures a secret (an API key,
  another user's data) believing it's server-only, that value has now left
  the server. Keep secrets out of a Server Function's closure; pass what
  the function actually needs as an explicit, validated argument instead.

None of this is exotic — it's the same discipline you'd apply to an HTTP
handler. The difference is that a Server Function doesn't *look* like one at
the call site, which is exactly why it's easy to forget.

### Further reading (optional)

- [React docs: 'use server' directive](https://react.dev/reference/rsc/use-server)
- [React docs: useActionState](https://react.dev/reference/react/useActionState)
- [Next.js docs: Server Actions and security](https://nextjs.org/docs/app/guides/server-actions)
- [Next.js discussion: Server Actions and security](https://github.com/vercel/next.js/discussions/68155)
