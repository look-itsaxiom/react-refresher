# Derived state and keys

Two habits separate React code that stays simple from React code that fights itself: **derive instead of duplicate**, and **give identity with keys**.

## Derive, don't duplicate

If a value can be computed from props or existing state, compute it during render. Do not store it in a second `useState` and try to keep the two in sync.

```tsx
// ❌ two sources of truth that will drift
const [items, setItems] = useState(initial);
const [total, setTotal] = useState(0);
useEffect(() => { setTotal(items.reduce((s, i) => s + i.price, 0)); }, [items]);

// ✅ one source of truth; the rest is arithmetic
const [items, setItems] = useState(initial);
const total = items.reduce((s, i) => s + i.price, 0);
```

The "effect that copies state into other state" pattern causes an extra render, a frame where the UI is inconsistent, and a class of bugs where the copy is stale. The React docs call this out under [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect), and the React Compiler makes the "but it's expensive to recompute" objection mostly moot: it memoizes derived values for you when the inputs have not changed.

The same applies to props: do not mirror a prop into state unless you intentionally want an *initial value that then diverges* (a "draft" you edit). Name it that way: `const [draftTitle, setDraftTitle] = useState(title)`.

## Keys are identity, not indexes

When you render a list, React needs to know which element in the new render corresponds to which element in the previous one. That is what `key` is for.

```tsx
{todos.map((todo) => <TodoRow key={todo.id} todo={todo} />)}
```

Using the array index as a key tells React "the item at position 2 is the same thing it was last time", which is false the moment you insert, remove, or reorder. Symptoms: input text that jumps to the wrong row, animations on the wrong element, and state (`useState` inside `TodoRow`) attached to the wrong item.

Keys also work as a **reset button**. Changing a component's `key` unmounts the old instance and mounts a fresh one with fresh state:

```tsx
<ProfileForm key={userId} userId={userId} />
```

That single line replaces a `useEffect` that resets form fields whenever `userId` changes.

## What "same component, same position" means

React preserves state as long as the same component type renders at the same position in the tree. Swap `<Counter />` for `<div><Counter /></div>` and the counter resets, because its position changed. Conditionally rendering `{isFancy ? <Counter fancy /> : <Counter />}` keeps the state, because it is the same type at the same position with different props.

Take the quiz next; it covers the snapshot model, batching, and keys.
