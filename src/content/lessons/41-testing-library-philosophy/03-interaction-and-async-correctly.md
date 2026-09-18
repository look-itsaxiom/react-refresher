## Interaction and async, correctly

Queries answer "what's there." The other half of Testing Library is "what happens when a user
does something," and that's where most flaky and misleading tests come from — usually because a
test drove the UI in a way no real user could, or asserted before the UI had actually settled.

### `user-event` over `fireEvent`

`fireEvent.click(button)` dispatches exactly one DOM event. A real click is a sequence —
`pointerdown`, `mousedown`, `focus`, `pointerup`, `mouseup`, `click` — and a component that reacts
to `mousedown` (a custom dropdown, a drag handle) will pass a `fireEvent` test and fail for an
actual user. `@testing-library/user-event` (v14) simulates that full sequence, plus the browser
behaviors around it: clicking a disabled element does nothing, typing into a field with
`maxLength` stops at the limit, and a click on an element covered by `pointer-events: none` — or
an ancestor's — doesn't register, exactly as it wouldn't in a browser. Reach for `fireEvent`
directly only when you need an event `user-event` doesn't model (a raw `scroll`, a synthetic
`change` on a non-form element) and say why in a comment.

Every test using `user-event` starts with a per-test instance:

```tsx
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();
await user.click(button);
await user.type(input, 'hello@example.com');
```

`setup()` (not the old default-export API from v13) returns an instance you `await` every call
on, because `user-event` schedules real timers between keystrokes and pointer events by default.
Key methods: `type` (keystroke by keystroke — use it when the component reacts to individual
`onChange` events, e.g., a live validator) vs. `paste` (one atomic insert — closer to how most
users actually fill a field, and much faster in a big suite); `click`/`dblClick`/`hover`;
`selectOptions`/`deselectOptions` for `<select>`; `upload` for `<input type="file">`;
`tab` for keyboard-only flows (focus order, a modal that traps focus). The `setup({ delay: null })`
option removes the artificial delay between keystrokes when a test doesn't care about timing —
useful in large suites where the realism doesn't pay for itself — and `pointerEventsCheck` (an
enum, not the old `skipPointerEvents` boolean) controls how often `user-event` re-checks whether a
target is covered by something with `pointer-events: none`, trading a little realism for speed on
deeply nested trees.

### Waiting for things to appear, disappear, and settle

- **`findBy*`** = `getBy*` inside `waitFor`, with a default 1000ms timeout. Use it for "this
  shows up after an async gap": `await screen.findByText('Order confirmed')` after clicking
  submit.
- **`waitForElementToBeRemoved`** handles the opposite case — a spinner, a toast, a modal that
  unmounts — and it needs the element *already present* when you call it:

  ```tsx
  const spinner = screen.getByRole('progressbar');
  await waitForElementToBeRemoved(spinner);
  ```

  Passing a callback that re-queries also works, and is required when the element doesn't exist
  yet at call time in some code paths.
- **Plain `waitFor`** is the general tool underneath both, for asserting on anything that isn't a
  single query — a mock's call count, a value in `localStorage`. Exactly one assertion per
  callback; the callback re-runs on an interval until it stops throwing or times out, so mutating
  state inside it multiplies the mutation.
- **Fake timers** (`vi.useFakeTimers()`) and `user-event` don't mix well by default: `user-event`
  schedules its own real timers between actions, so with fake timers installed you generally need
  `user.setup({ advanceTimers: vi.advanceTimersByTime })` to hand control of the clock to
  `user-event` itself, or call `await vi.advanceTimersByTimeAsync(ms)` between interactions.

### Suspense, Actions, and the `act` environment

React 19 batches and reconciles more aggressively, which is why `act()` matters more, not less,
in tests: it flushes state updates, effects, and (in the testing environment) the microtasks React
schedules for `use()` and transitions, so assertions afterward see the settled DOM. Testing
Library's `render` already wraps itself in `act`, but a render that *suspends* — a component
calling `use()` on a pending promise, or one wrapped in `<Suspense>` — may not fully settle from
that single wrapping `act` in jsdom. This course's own render helper handles it by wrapping the
call explicitly:

```tsx
await act(async () => {
  render(<ProfileWithSuspense />);
});
```

The same applies to a form using React 19 Actions (`useActionState`, `<form action={fn}>`) —
submitting one is asynchronous even when the action itself resolves instantly, so
`await user.click(submitButton)` needs to be followed by a `findBy*`/`waitFor`, not a bare
`getBy*`, for whatever the action's result renders.

### `renderHook`, custom renders, and the direction of travel

`renderHook` from `@testing-library/react` tests a hook without a wrapping component:

```tsx
const { result } = renderHook(() => useCounter(10));
act(() => result.current.increment());
expect(result.current.count).toBe(11);
```

It's for hooks with logic worth isolating (a reducer-backed hook, a debounce hook) — most hooks
are better tested through the component that uses them, since that's what a user actually
interacts with.

For any component that needs a provider (theme, router, query client), write one custom `render`
that wraps `@testing-library/react`'s and reuse it everywhere, rather than repeating the provider
tree in every test file. `configure({ throwSuggestions: true })` from `@testing-library/dom` is
worth turning on in a test-setup file — it throws when you use a weaker query (say,
`getByTestId`) where a better one existed, which is faster feedback than an accessibility audit
later. `logRoles(container)` prints every role Testing Library can currently see in a chunk of
DOM — the fastest way to find out why a `getByRole` isn't matching what you expect.

Vitest's Browser Mode ships its own **locator API** (check the current docs for
its exact stability milestone — it moved from experimental to stable across recent
majors) —
`page.getByRole(...)`, `.locator(...)` — that runs the same accessibility-first queries against a
real browser instead of jsdom, with built-in auto-retrying assertions (closer to Playwright's
locators than to `@testing-library/dom`'s snapshot-style queries). It's the direction most new
component-test setups are heading for anything jsdom approximates poorly — layout, real CSS,
`IntersectionObserver` — while `@testing-library/react` in jsdom remains the faster default for
everything else.

### Further reading

- [Testing Library — `user-event` introduction](https://testing-library.com/docs/user-event/intro)
- [Testing Library — `user-event` options (`pointerEventsCheck`, `delay`, `advanceTimers`)](https://testing-library.com/docs/user-event/options/)
- [Testing Library — async utilities (`findBy*`, `waitFor`, `waitForElementToBeRemoved`)](https://testing-library.com/docs/dom-testing-library/api-async)
- [Vitest — Browser Mode locators](https://vitest.dev/api/browser/locators)
