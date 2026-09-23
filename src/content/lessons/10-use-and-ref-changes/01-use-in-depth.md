# `use()`: the rest of the story

You've already seen `use()` twice: reading a promise under a Suspense boundary (Suspense and Transitions), and reading context in place of `useContext` (Context and Composition). Both are the same primitive doing two different jobs. This step fills in what those lessons left out: how to make a promise safe to `use()`, where `use()` may and may not be called, and how it fits into a client/server boundary.

## The promise must be a cache hit, not a fresh call

`use(promise)` suspends the component until `promise` settles, then returns its value (or re-throws its rejection). The trap is that "the promise" has to mean the *same* promise object across renders:

```tsx
// ❌ a new promise every render — this suspends forever
function Profile({ id }: { id: number }) {
  const user = use(fetchUser(id));
  return <h2>{user.name}</h2>;
}
```

Render runs, `fetchUser(id)` creates promise #1, the component suspends, React shows the fallback. Promise #1 resolves — but nothing told React to re-render `Profile`, because resolving a promise isn't a state update. Eventually something else re-renders the tree, `Profile` runs again, calls `fetchUser(id)` again, gets a *new* pending promise #2, and suspends again. The data never has a chance to reach the screen through this path (in practice `@server/*` calls in this course cache internally, which is why the earlier exercises worked without you having to think about this).

The fix is to give the promise a stable identity that outlives the render that created it. Two common shapes:

```tsx
// A module-level cache keyed by id — same promise on every render for the same id
const userCache = new Map<number, Promise<User>>();
function getUser(id: number): Promise<User> {
  let p = userCache.get(id);
  if (!p) {
    p = fetchUser(id);
    userCache.set(id, p);
  }
  return p;
}

function Profile({ id }: { id: number }) {
  const user = use(getUser(id)); // same promise object across re-renders of this id
  return <h2>{user.name}</h2>;
}
```

```tsx
// Or: create the promise once, above the component that reads it, and pass it down
function ProfilePage({ id }: { id: number }) {
  const userPromise = useMemo(() => fetchUser(id), [id]);
  return <Profile userPromise={userPromise} />;
}
function Profile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise); // stable prop, not recreated by this component
  return <h2>{user.name}</h2>;
}
```

Data libraries (TanStack Query, Relay, framework loaders) exist partly to own this cache for you so application code never hand-rolls it. When you see `use()` in a real codebase, look for where the promise it reads was created — if the answer is "inline, in this same component, with no cache," that's a bug waiting for the right re-render to trigger it.

## Rejections need an error boundary, not a `try`/`catch`

`use()` cannot be called inside `try`/`catch`. It relies on throwing internally — a pending promise throws the promise itself, a rejected one throws the rejection reason — and wrapping it in `try`/`catch` would swallow the mechanism Suspense depends on. Handle failures the same way you handle a component that throws for any other reason: an error boundary above it.

```tsx
<ErrorBoundary fallback={<p>Couldn't load profile.</p>}>
  <Suspense fallback={<Spinner />}>
    <Profile userPromise={userPromise} />
  </Suspense>
</ErrorBoundary>
```

If you need to turn a rejection into inline UI instead of unmounting a whole subtree, catch it before `use()` ever sees it — attach `.catch()` when you create the promise and resolve to a tagged result (`{ ok: false, error }`) instead of letting it reject.

## Where `use()` may run

`use()` is not subject to the Rules of Hooks — call it conditionally, in a loop, after an early return, inside a helper function that a component calls during render. What it *does* require is that the call happen **during render**: inside a component function or another hook, evaluated as part of producing output. It cannot be called inside a `useEffect`, an event handler, `useMemo`'s callback, or anywhere outside a component's render — those all run after render has already committed or independently of it, and `use()`'s suspend-and-retry mechanism only makes sense while React is actively rendering.

```tsx
function Widget({ ctx }: { ctx: React.Context<Theme> }) {
  useEffect(() => {
    const theme = use(ctx); // ❌ throws — not during render
  }, [ctx]);
}
```

This is the same restriction `useContext` and every other hook already have (hooks only run during render); `use()` just relaxes *which* render paths are allowed, not *when*.

## Promises crossing a server/client boundary

The pattern you're most likely to meet `use()` in production is a framework passing a promise from a Server Component into a Client Component as a prop, without awaiting it first:

```tsx
// Server Component (runs on the server, can be async itself)
export default function Page({ id }: { id: string }) {
  const commentsPromise = fetchComments(id); // not awaited — starts the request, keeps going
  return (
    <Suspense fallback={<CommentsSkeleton />}>
      <Comments commentsPromise={commentsPromise} />
    </Suspense>
  );
}

// Client Component
'use client';
function Comments({ commentsPromise }: { commentsPromise: Promise<Comment[]> }) {
  const comments = use(commentsPromise);
  return <ul>{comments.map((c) => <li key={c.id}>{c.text}</li>)}</ul>;
}
```

The server starts the slow work, sends the rest of the page immediately, and streams the resolved value down when it's ready — the client never re-requests it. `use()` is the hook that lets a Client Component receive "a value that's on its way" instead of "a value" or "a loading boolean." This sandbox doesn't have a server/client split, but the mental model — someone upstream created the promise, you `use()` it downstream — is the same as the module-cache pattern above with the boundary drawn between processes instead of components.

## A note on testing

Suspending a component doesn't always resolve synchronously in a test environment. If a check `render()`s a component that suspends and then immediately asserts on the resolved content, the assertion can run before React has finished the retry-and-commit cycle. Wrapping the interaction in `await act(async () => { ... })` (or using `findBy*` queries, which already poll) gives React's microtask queue a chance to flush before you assert — you'll see this in the exercise checks for this lesson.

## Further reading (optional)

- [`use` reference](https://react.dev/reference/react/use) — react.dev
- [Streaming with Suspense](https://react.dev/reference/react/Suspense#streaming-content-as-it-loads) — react.dev
- [`act` reference](https://react.dev/reference/react/act) — react.dev
