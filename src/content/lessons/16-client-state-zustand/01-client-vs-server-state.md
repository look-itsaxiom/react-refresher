# What client state actually is

The [previous lesson](../15-server-state-tanstack-query) drew a line: server state is
data your app doesn't own — it lives on a server, can go stale, and TanStack Query owns
fetching, caching, and invalidating it. Everything on the other side of that line is
**client state**: things that exist only because the UI needs them; a sidebar's
open/closed flag, the text in a controlled input before it's submitted, which tab is
active, a shopping cart's contents before checkout, a draft comment, a websocket's
connection status. Nothing on a server "owns" this data. Your component tree is the
source of truth for it.

Conflating the two is where a lot of unnecessary complexity comes from. Copying a fetched
`user` into `useState` "so I can edit it locally" creates two sources of truth that drift.
Storing a `TanStack Query` result inside a Zustand store duplicates a cache that already
has its own invalidation logic. The rule of thumb: if the answer to "where does this value
ultimately come from" is a server response, it's server state and belongs in the query
cache; if the answer is "the user is doing something right now, in this browser tab," it's
client state.

## When `useState`, lifting, and context are enough

Most client state doesn't need a library. React's built-ins solve it fine:

- **`useState` local to one component** — a single input's value, a hover flag, whether a
  tooltip is open. No sharing required, no library needed.
- **Lifting state up** — two sibling components need the same value, so it moves to their
  nearest common parent and flows down as props. This scales further than people expect;
  a form with a dozen fields lifted into one parent component is still simpler than
  reaching for a store.
- **`context` plus `useReducer`** (covered in [lesson 5](../05-context-and-composition)) —
  state that many components at different depths need to read, updated relatively rarely:
  theme, the current authenticated user, a feature-flag set, a wizard's current step. The
  cost of context is that **every** consumer re-renders on **any** value change unless you
  split providers or memoize the value carefully, which is fine for state that changes a
  handful of times per session and expensive for state that changes on every keystroke.

That last point is the actual boundary. Context was never designed as a general state
manager — the React docs are explicit that it's for values needed by many components at
different nesting levels, not as a replacement for prop passing everywhere, and its
re-render behavior punishes high-frequency updates.

## When a store earns its keep

Reach for an external store — Zustand, Jotai, Redux Toolkit — when one or more of these is
true:

1. **Update frequency is high and the consumers are far apart in the tree.** A drag
   position, a live cursor, a websocket price feed updating multiple times a second, read
   by a header badge and a deeply nested panel. Context re-renders the whole subtree on
   every tick; a store with per-component selectors only re-renders the components that
   read the changed slice.
2. **Something outside a component tree needs to read or write it.** An analytics module
   that logs the current cart contents, a non-React script, an error boundary that wants
   to reset app-wide UI state, a `fetch` interceptor that needs the current auth-modal
   state. Context only exists inside `<Provider>` and only inside render; a store's
   `getState()`/`setState()` work from anywhere, which is exactly the
   `useSyncExternalStore` contract from [lesson 9](../09-external-stores) — get/subscribe
   methods that exist independent of any component.
3. **You want selector-based subscriptions without restructuring the provider tree.**
   Splitting a `UserContext` from a `ThemeContext` from a `CartContext` to avoid unrelated
   re-renders is exactly what a store's selectors give you for free, per piece of state,
   without adding a provider per concern.
4. **The state needs middleware-shaped behavior** — persisting to `localStorage`,
   logging every transition for debugging, undo/redo, syncing across tabs. Stores compose
   this as middleware; context has no equivalent seam.

If none of those apply, context or lifted state is not a compromise — it's the right
choice, and adding a store is the overengineering.

## The 2026 landscape

The **State of React 2025** developer survey is the clearest signal available on what
teams actually reach for. Zustand's usage roughly doubled in two years (28% in 2023 to
about 50% in 2025) and it now leads every library in this category on developer
satisfaction, even though plain Redux is still used by more respondents overall (its usage
has been declining year over year). Jotai grew steadily too (13% to 19%), still a minority
choice but climbing. And notably, roughly a third of respondents use no external state
library at all — `useState`/`useContext` covers their app. The trend line across the
survey is unambiguous: teams are moving away from boilerplate-heavy, highly opinionated
tools toward small stores with a plain function API, and reaching for a store later than
they used to.

That's the frame for this lesson: Zustand as the default choice when a store is
warranted, Jotai as the atomic alternative worth knowing, Redux Toolkit for the cases that
still call for its structure, and XState when the shape of the problem is a state machine,
not a bag of values.

## Further reading

- [Passing Data Deeply with Context](https://react.dev/learn/passing-data-deeply-with-context) — react.dev
- [State of React 2025: State Management](https://2025.stateofreact.com/en-US/libraries/state-management/) — 2025.stateofreact.com
- [Zustand: comparison with other libraries](https://zustand.docs.pmnd.rs/getting-started/comparison) — zustand.docs.pmnd.rs
- [You Might Not Need Redux](https://redux.js.org/faq/general#when-should-i-use-redux) — redux.js.org
