# Reconciliation and identity

You already know from Rendering and state that a render produces a new tree of elements
and React diffs it against the last one to decide what to touch in the DOM. For a single
element that diff is trivial: same type, same position, patch the props. For a **list**, React
needs an extra piece of information it cannot infer on its own — which new item corresponds to
which old item — and `key` is the only way you give it that answer.

## What the diff actually does with a list

Without keys, React's default reconciliation for a list of children compares them **by
position**: child 0 against child 0, child 1 against child 1, and so on. If the type at a
position matches, React reuses that fiber (and everything hanging off it — state, DOM node,
effect cleanup timing) and just updates props. If the type differs, React tears down the old
subtree and mounts a new one.

`key` changes the comparison from "by position" to "by identity". React builds a map of
key → child for the old set and the new set, matches them up, and then reuses, moves, inserts,
or deletes fibers based on that match — regardless of where an item ended up in the array.
This is why moving an item in a keyed list is cheap (one DOM move, state carried along) while
an unkeyed reorder either mismatches types or updates every prop down the line.

## Why the index is not identity

`items.map((item, i) => <Row key={i} item={item} />)` compiles and runs. It also silently
breaks the moment the list's *shape* changes — insert, remove, sort, filter, shuffle — because
the index describes a **slot**, not a **thing**. Position 2 is not "the same row as before" just
because it's still position 2.

Concretely, given a list of rows where each `Row` owns its own `useState` for an input's draft
text:

```tsx
// ❌ index as key
{todos.map((todo, i) => <TodoRow key={i} todo={todo} />)}
```

Type into row 2's input, then delete row 1. Row 2's *DOM node and state* stay at index 1 —
React sees "same key, same type" at that position and reuses the fiber, including the `useState`
inside it. But the `todo` prop passed down is now the item that used to be at index 2. Result:
the text you typed appears next to the wrong todo. The same mechanism causes CSS transitions to
animate the wrong element and `<input defaultValue>` to show stale content after a reorder.

The fix is a key drawn from the data itself — a database id, a UUID generated once at creation,
anything stable and unique among siblings for the lifetime of the list:

```tsx
// ✅ stable identity
{todos.map((todo) => <TodoRow key={todo.id} todo={todo} />)}
```

Index keys are *not always wrong*. They're fine when the list is static (never reordered,
filtered, or mutated in place) and has no per-item state or focus to preserve — a fixed legend,
a set of table column headers. The rule of thumb: if the list can change shape, or if any child
holds its own state, the key must come from the data.

## Keys only matter among siblings

A key only has to be unique among its **immediate siblings** in one array or fragment — not
globally in the app. `key={todo.id}` in one list and `key={comment.id}` in a completely
different list can reuse the same numbers without conflict, because React never compares keys
across different parents.

Keys also apply to `<Fragment key={...}>`, which matters when you map to more than one element
per item without a wrapper `<div>`:

```tsx
{sections.map((s) => (
  <Fragment key={s.id}>
    <dt>{s.term}</dt>
    <dd>{s.definition}</dd>
  </Fragment>
))}
```

The short `<>...</>` syntax cannot take a key — you need the explicit `Fragment` import for
keyed groups.

## `key` as a reset switch

Because a key change tells React "this is a different thing", changing a key on purpose forces
React to discard the old fiber (unmounting it, running cleanup, dropping state) and mount a
brand-new one. This is the idiomatic way to reset a component's internal state when some
external identity changes, without an effect:

```tsx
<ProfileForm key={userId} userId={userId} />
```

When `userId` changes, `ProfileForm` fully remounts: every `useState` re-initializes, every
effect re-runs `setup` from scratch. Compare that to a `useEffect(() => { resetFields() },
[userId])`, which runs *after* a render with stale field values already committed, causing a
visible flash. The key swap skips that render entirely.

The same trick clears an uncontrolled `<input>` or resets a third-party widget that keeps
internal state you don't control: bump the key, get a fresh instance.

## What the Compiler does not fix

The React Compiler (see "What the React Compiler does" later in the curriculum) memoizes values and skips re-rendering
components whose inputs haven't changed. It has nothing to do with reconciliation identity.
Giving a list stable keys is not an optimization the Compiler can infer or correct — a wrong key
does not make your code slower, it makes it **produce the wrong UI**, silently, because React
has no way to know your index-based key was a mistake rather than an intentional statement that
position *is* the identity. Treat `key` as a correctness requirement, not a performance knob.

## Further reading (optional)

- [react.dev — Rendering Lists](https://react.dev/learn/rendering-lists)
- [react.dev — Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state)
- [react.dev — `key` API reference](https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key)
