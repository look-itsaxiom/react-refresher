# Suspense is a boundary, not a spinner

In React 18-era code you probably wrote loading UI like this:

```tsx
const [user, setUser] = useState(null);
const [loading, setLoading] = useState(true);
useEffect(() => { fetchUser(1).then((u) => { setUser(u); setLoading(false); }); }, []);
if (loading) return <Spinner />;
```

Every component that loads something re-implements this dance, and the loading states do not compose: three siblings each show their own spinner at slightly different times.

## The Suspense model

Suspense flips the ownership. A component that needs data it does not have yet **suspends** (throws a promise, in implementation terms). The nearest `<Suspense>` ancestor catches that and shows its `fallback` until the data arrives, then renders the real content. The component itself contains no loading logic.

```tsx
<Suspense fallback={<p>Loading profile…</p>}>
  <UserProfile />
</Suspense>
```

Where you put the boundary decides the granularity of the loading state. One boundary around the page: one spinner. A boundary per card: independent skeletons. Nested boundaries: the outer one shows first, inner ones reveal as they resolve.

## Reading a promise with `use()`

React 19 added `use`, a hook-like API that reads a promise (or a context) during render and suspends until it resolves:

```tsx
import { use } from 'react';

function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise);   // suspends until resolved; throws if rejected
  return <h2>{user.name}</h2>;
}
```

Two rules make `use` work:

1. **The promise must be stable across renders.** If you create a new promise inside render (`use(fetchUser(1))`), every attempt to render produces a new pending promise and the component suspends forever. Create it once (in a parent, in a cache, in a loader) and pass it down. Frameworks and libraries like TanStack Query own this caching for you; in this sandbox the `@server/*` helpers cache for you where needed.
2. **A rejected promise throws during render**, so pair Suspense with an error boundary for real apps.

Unlike other hooks, `use` may be called inside conditions and loops.

## What the fallback replaces

When something suspends, React hides the **entire subtree under the nearest boundary** and shows the fallback. If you wrap your whole page in one boundary, a tiny widget loading late blanks the page. Put boundaries around the parts that load independently.

In the exercise, a profile component already reads a promise with `use`. Your job is to decide where the boundary goes and what it shows.
