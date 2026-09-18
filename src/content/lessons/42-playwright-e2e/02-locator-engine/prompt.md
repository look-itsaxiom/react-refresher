Playwright can't run in this sandbox, so this exercise implements a tiny, simplified stand-in for
its two core ideas — a chainable locator query and strict-mode errors — as pure functions you can
actually step through. It is not the real ARIA accessible-name algorithm; treat it as a model, not
a spec.

Finish three functions:

```ts
type Step =
  | { kind: 'role'; role: string; name?: string }
  | { kind: 'text'; text: string; exact?: boolean }
  | { kind: 'testId'; id: string }
  | { kind: 'filter'; hasText: string }
  | { kind: 'nth'; index: number }
  | { kind: 'locator'; css: string };
type Chain = Step[];

function roleOf(el: Element): string | null;
function locate(root: Element, chain: Chain): Element[];
function strictOne(chain: Chain, root: Element): Element;
```

**`roleOf(el)`** returns a simplified ARIA role for one element, or `null` if it has none:
- an explicit `role` attribute always wins.
- `<button>`, and `<input type="button"|"submit"|"reset">`, are `'button'`.
- `<a href="...">` is `'link'` (an `<a>` with no `href` has no role).
- `<h1>`–`<h6>` are `'heading'`.
- `<textarea>`, and `<input>` with no `type` or `type` in `text`/`search`/`email`/`tel`/`url`, are
  `'textbox'`.
- `<input type="checkbox">` is `'checkbox'`.
- everything else is `null`.

An element's **accessible name**, for matching `name`, is its `aria-label` if present, otherwise
its `textContent` with whitespace collapsed and trimmed.

**`locate(root, chain)`** resolves a chain of steps against the live DOM under `root`, step by
step, each step narrowing (or replacing) the candidate set the previous step produced. It must
re-read the DOM every time it's called — never cache a result across calls, since the whole point
of a locator is that it reflects whatever the DOM looks like *right now*. Step semantics:

- `role`: from the current candidates (or, if this is the first step, every descendant of `root`),
  keep elements whose `roleOf(...)` matches `role`, and, if `name` is given, whose accessible name
  exactly equals `name`.
- `text`: keep elements (from the current candidates, or every descendant of `root` if first) whose
  normalized `textContent` includes `text` (or exactly equals it, if `exact: true`) — but drop any
  element that has a *descendant* also in that matching set, so only the innermost matching element
  survives. This mirrors why Playwright's `getByText('Trail mix')` finds the `<span>`, not the
  `<li>` wrapped around it.
- `testId`: keep elements whose `data-testid` attribute equals `id`.
- `filter`: keep only candidates whose own subtree's `textContent` includes `hasText`.
- `nth`: replace the candidate set with a single-element array holding the element at `index` (or
  `[]` if out of range).
- `locator`: for each current candidate (or `root`, if first step), run `querySelectorAll(css)`
  against it and concatenate the results, in order, without duplicates.

**`strictOne(chain, root)`** calls `locate`, and if the result isn't exactly one element, throws
`new Error('strict mode violation: locator resolved to ' + matches.length + ' elements')` —
otherwise returns that one element.

The default export renders a small fixture list (two rows with a "Remove" button each, an "Add"
button, a link, and a checkbox) so you have something real to test `locate` against in the preview;
you don't need to change it.
