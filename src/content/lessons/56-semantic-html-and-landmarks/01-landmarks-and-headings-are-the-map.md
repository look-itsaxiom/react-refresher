# Landmarks and headings are the map

Lesson 55 fixed a page that had no `<main>`, no `<nav>`, and a skipped heading level. That was
triage. This lesson is about the system those fixes belong to: screen reader users don't read a
page top to bottom looking for structure — they open a generated list of it and jump straight to
the part they want. If your markup doesn't produce a good list, the page is effectively
unnavigable, no matter how it looks.

## Three lists, not one document

NVDA, JAWS, and VoiceOver all expose the same three views on any page:

- **Landmarks** — the page's regions: banner, navigation, main, complementary, contentinfo,
  search, form, region. NVDA's browse-mode quick-nav key for this is `D` (`shift+D` to go
  backward); VoiceOver users open the same list from the rotor (`VO+U`, then arrow to
  "Landmarks").
- **Headings** — every `h1`–`h6` on the page, indented by level, giving an outline. NVDA's key
  is `H`; VoiceOver's rotor has a "Headings" category with its own sub-navigation by level.
- **Links** (and, separately, form fields, tables, lists) — NVDA's `K`, `F`, `T`, `L`.

A sighted user skims with their eyes in about a second. A screen reader user does the equivalent
by opening one of these lists and reading item names — which means every item's *name* has to be
meaningful, and the *set* of items has to reflect the page's real structure. Two failure modes
dominate: landmarks or headings that don't exist (so the list is nearly empty and useless), and
landmarks or headings that exist but are unnamed or misleveled (so the list exists but lies).

## Which elements are landmarks — and when they stop being one

Six roles come from plain HTML, no `role` attribute required:

| Element | Implicit role | Landmark? |
|---|---|---|
| `<header>` | `banner` | only when **not** scoped inside `<article>`, `<aside>`, `<main>`, `<nav>`, or `<section>` |
| `<footer>` | `contentinfo` | same scoping rule as `<header>` |
| `<nav>` | `navigation` | always |
| `<main>` | `main` | always (one per page) |
| `<aside>` | `complementary` | always |
| `<form>` (with an accessible name) | `form` | only if it has a name |
| `<search>` | `search` | always |

The `<header>`/`<footer>` rule trips up more real codebases than any other landmark fact: a
`<header>` at the top of your JSX *looks* like the site banner, but if it's rendered inside a
`<main>`, an `<article>`, or a `<section>`, it's scoped to that ancestor instead — its accessible
role becomes a non-landmark "section header," not `banner`. HTML-AAM calls this "scoped": scoped
to `body` (no intervening sectioning content) gets you `banner`/`contentinfo`; scoped to
`<article>`/`<aside>`/`<main>`/`<nav>`/`<section>` gets you nothing landmark-shaped. This is
exactly why a page layout component that wraps every route's content in `<main><header>…` is
fine — that header describes the page, not the site — but a design system `<Card>` that renders
`<header>` for its title bar is *also* fine, and neither one pollutes the landmark list with
noise. The rule exists so nesting doesn't produce five "banner" landmarks on one page.

`<section>` is the opposite trap: it has **no** implicit landmark role at all unless it has an
accessible name (an `aria-label`, or `aria-labelledby` pointing at a heading). An unnamed
`<section>` is accessibility-invisible — screen reader users can't jump to it, and it doesn't
appear in any list. Add a name and it becomes a `region` landmark. This is a deliberate design
in the ARIA spec: sighted developers reach for `<section>` constantly as a stylistic grouping
element, and if every one of those became a landmark, the landmark list would be as useless as
having none. Only label a `<section>` when it's a genuine destination someone would want to jump
to — a "Related articles" block, not every card wrapper.

```tsx
// Two navs on one page need distinguishable names, or a landmark list
// shows "Navigation, Navigation" and the user can't tell them apart.
<nav aria-label="Primary">…</nav>
<nav aria-label="Footer">…</nav>

// Naming a section by pointing at its own visible heading — no duplicated
// text, and the visible heading and the landmark name can never drift apart.
<section aria-labelledby="related-heading">
  <h2 id="related-heading">Related articles</h2>
  …
</section>
```

Any landmark type that appears more than once on a page needs a distinguishing `aria-label` or
`aria-labelledby` — one unlabeled `<nav>` is fine, two are a bug. Prefer `aria-labelledby`
pointing at a heading that's already visible over `aria-label` duplicating text, for the same
reason `htmlFor` beats a manually re-typed label: one source of truth.

## Headings: one `h1`, no skipped levels, no exceptions for style

The heading list is only useful if it matches the page's actual information hierarchy: exactly
one `h1` (the page's own title, not a logo image with alt text posing as one), and each
subsequent level introduced in order — `h2` before any `h3`, `h3` before any `h4`. The browser
generates this outline from the tags alone; it has no idea a `<h4>` was chosen because a
designer wanted smaller text. That's the whole bug in lesson 55's tree-fixing exercise, generalized:
heading level is a structural signal, not a font-size shortcut. If you want an `h2`'s visual
weight without claiming `h2` in the outline, style an `h3` — never skip a level to get a look.

Sometimes you need a heading for structure (an `<h2>` a screen reader user can jump straight to)
without wanting it to take up visual space — a form's `<h2>Filters</h2>` above a compact filter
bar, say. Visually hiding it needs to remove it from *layout* but keep it in the *accessibility
tree*, which is the opposite of what `hidden` or `aria-hidden` do (lesson 55). The standard
pattern is a `.sr-only` (or `.visually-hidden`) class:

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
```

This clips the element to a single pixel instead of using `display: none` or `visibility:
hidden`, both of which *do* pull it out of the accessibility tree. It's a CSS convention, not a
platform feature — no browser ships a `.sr-only` class for you, and Tailwind's `sr-only` utility
is exactly this rule.

## Skip links: focus has to move, not just the viewport

A "skip to content" link that only does `<a href="#main">Skip to content</a>` scrolls the page —
in every browser, a same-document fragment link both scrolls *and* moves focus to the target, but
only if the target is *focusable*. A bare `<main>` isn't; clicking the link visually jumps the
viewport, but a screen reader's focus (and a sighted keyboard user's visible focus ring) stays
back at the link, so the next `Tab` press goes to whatever was after the link in the DOM — not
into the content. The fix is `tabindex="-1"` on the target, which makes an element
programmatically focusable (via script or a fragment link) without adding it to the normal `Tab`
order:

```tsx
function App() {
  const mainRef = useRef<HTMLElement>(null);
  return (
    <>
      <a
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          mainRef.current?.focus();
        }}
      >
        Skip to content
      </a>
      <nav aria-label="Primary">…</nav>
      <main id="main-content" ref={mainRef} tabIndex={-1}>
        …
      </main>
    </>
  );
}
```

Calling `.focus()` explicitly (rather than relying on the fragment navigation alone) is the
robust version — it works even if something intercepts the click, and it's the same technique a
router uses to move focus to the new page's heading on client-side navigation, which plain
fragment scrolling never does.

## Where React specifically breaks this

None of the above is React-specific, but three things about component architecture make it easy
to violate anyway:

- **Fragments don't add landmarks for you.** `<>{children}</>` is invisible to the accessibility
  tree, which is usually right — but it also means a "page" composed of five sibling components
  each returning their own top-level `<div>` has no `<main>` anywhere unless one of them
  explicitly renders it. Landmark structure has to be a deliberate decision at the layout level,
  not something that falls out of composing components.
- **Portals render where they're mounted in the DOM, not where they're written in JSX.** A
  modal's content, portaled to `document.body`, sits as a sibling of your `<main>`, not inside
  it — which is usually desired (it shouldn't be nested inside `main`'s landmark, since a modal
  interrupts the page rather than continuing it), but confirm it with DevTools' Accessibility
  pane, not just by reading the JSX.
- **A `<Layout>` component is often the only place `<header>`, `<nav>`, and `<main>` get written
  at all.** If every route's page component is `<div className="page">…</div>` and `<Layout>`
  wraps it in the real landmarks, that's correct — one clean set of landmarks per page. But if a
  page component *also* renders its own `<div className="page-header">`, you've got a `<div>`
  masquerading as structure right next to the real thing, and it's easy to lose track of which
  one is actually in the accessibility tree.

## Further reading

- [Landmark Regions — WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/)
- [HTML-AAM: header and footer scoping](https://github.com/w3c/html-aam/issues/222)
- [`<search>` — MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/search)
- [NVDA Keyboard Shortcuts — WebAIM](https://webaim.org/resources/shortcuts/nvda)
