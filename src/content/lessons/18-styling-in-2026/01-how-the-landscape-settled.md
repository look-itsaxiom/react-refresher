# How the landscape settled

If you last styled React seriously in the React 18 era, three things happened since:
Tailwind rewrote its engine, CSS-in-JS lost its reason to exist for most teams, and the
platform grew CSS features that used to require JavaScript. None of this is a fad cycle —
each shift removed a real cost the previous approach had.

## Tailwind v4: CSS-first, not JS-first

Tailwind v4.0 (January 2025) replaced `tailwind.config.js` with configuration written in
CSS itself. You no longer install a PostCSS plugin and describe your theme in a JS object;
you write:

```css
@import "tailwindcss";

@theme {
  --color-accent: #61dafb;
  --font-display: "Inter", sans-serif;
  --breakpoint-3xl: 1920px;
}
```

Every token in `@theme` becomes a real CSS custom property (`var(--color-accent)`) *and*
a set of utility classes (`bg-accent`, `text-accent`, `border-accent`). That's the core
idea of v4: the design tokens and the generated utilities are the same data, expressed
once. This repo's own `src/index.css` does exactly this — check it in the codebase you're
running this course from.

Content scanning changed too. There's no `content: [...]` array to remember to update;
Tailwind's new Rust-based engine (Oxide) scans your project automatically and you only
add `@source "../some/other/dir"` for paths outside the default scan, or `@source not`
to exclude one (this project excludes its own `progress` folder that way). The Vite
integration is a dedicated `@tailwindcss/vite` plugin rather than a PostCSS pass, which is
part of why v4 full builds and incremental rebuilds are dramatically faster than v3.

v4.1 (April 2025) added `@source inline()` for classes assembled at runtime and text-shadow
utilities; v4.2 filled in the box-shadow/inset-shadow token pairing and default-baseline
tweaks; v4.3 (mid-2025) landed maskable image utilities, more color-mix–based
opacity handling, and continued to tighten container-query variants (`@container`,
`@sm`, `@lg` inside a container context) that shipped as first-class, no-plugin-required
utilities in v4.0. If you used the `@tailwindcss/container-queries` plugin in v3, delete
it — it's core now.

Dark mode in this project is a good v4 example of a "CSS-first" pattern replacing what
used to be a JS toggle library: `@custom-variant dark (&:where([data-theme=dark],
[data-theme=dark] *));` turns `dark:bg-surface` into a variant keyed off a `data-theme`
attribute you control from React state, no `matchMedia` listener or JS-computed class
needed at the utility level (React still sets the attribute — see the second concept step
for the pattern).

## CSS Modules: the boring default that won

While Tailwind absorbed the "I don't want to name things" crowd, CSS Modules remained the
answer for teams that want real, hand-authored CSS with locality guarantees and nothing
else: `.card { }` in `Card.module.css` compiles to a hashed class name, scoped to the file
that imported it, with zero runtime cost — the browser sees plain CSS, generated at build
time. No framework opinions, no theming API to learn, works identically in Vite, Next.js,
and every other bundler. It never needed a comeback narrative because it never left; it's
just no longer the *only* boring option, now that Tailwind's utility classes serve the same
"I don't want a CSS file at all" impulse for a different kind of team.

## Why runtime CSS-in-JS faded

Styled-components and Emotion won the late-2010s by co-locating styles with components and
supporting dynamic, prop-driven styles cleanly. Two things ended their default status:

1. **React Server Components have no client runtime to inject into.** Runtime CSS-in-JS
   libraries generate class names and insert `<style>` tags *during render*, in the
   browser. A Server Component renders on the server with no DOM and no client JS
   environment to mutate — so anything using this pattern needs a `"use client"`
   boundary, which defeats the point of writing a server-rendered component in the first
   place. In March 2025, styled-components' maintainer put the library into maintenance
   mode and said explicitly it doesn't work in Server Components without client
   boundaries, and that he "would not recommend adopting styled-components" for new work.
2. **The performance story was already lost by React 18.** React 18 shipped
   `useInsertionEffect` specifically to give CSS-in-JS libraries a hook that runs *after*
   the DOM is mutated but *before* layout is read, avoiding the layout thrashing that
   render-time style injection causes. Styled-components never adopted it. Emotion is
   healthier and still sees use, but the ecosystem's center of gravity had already moved
   to Tailwind and CSS Modules by the time RSC made the runtime approach a hard blocker
   rather than a performance tax.

**Zero-runtime CSS-in-JS** is the part of that family that survived: vanilla-extract,
Panda CSS, and Meta's StyleX all write your styles in TypeScript/JS but extract them to
static CSS files *at build time* — nothing runs in the browser, so they work fine in
Server Components. They trade styled-components' fully dynamic runtime interpolation for
a build step, which is exactly the trade the ecosystem decided was worth making.

## Further reading

- [Tailwind CSS v4.0](https://tailwindcss.com/blog/tailwindcss-v4)
- [Functions and directives — Tailwind CSS docs](https://tailwindcss.com/docs/functions-and-directives)
- [CSS in React Server Components — Josh W. Comeau](https://www.joshwcomeau.com/react/css-in-rsc/)
- [vanilla-extract](https://vanilla-extract.style/)
