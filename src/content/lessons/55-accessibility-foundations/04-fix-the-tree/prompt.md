This marketing page renders correctly and looks fine. It also produces almost none of the
accessibility tree a real user needs — it's built entirely from styled `<div>`s, unlabeled
images, a heading that jumps from `h1` straight to `h4`, and a bit of "hidden" text that a screen
reader will read out loud anyway. Open Chrome DevTools' Accessibility pane on it if you want to
see how little is actually there before you start.

Fix six things, all in `App.tsx`, without changing anything about how the page looks or the text
it contains:

1. **Landmarks.** Wrap the three top links in a `<nav>`, and wrap the page's main content in a
   `<main>`.
2. **Real links.** The "Home", "Pricing", and "Contact" items are currently `<div onClick={...}>`
   — nothing a keyboard or screen reader user can reach. Make them real `<a href="...">` elements
   (any non-empty `href` is fine; they don't need to navigate anywhere real).
3. **Heading hierarchy.** The page jumps from `<h1>` to `<h4>` with nothing in between. Change
   the second heading to `<h2>` — don't skip a level.
4. **A real button.** "Sign up free" is a `<div onClick={...}>` styled to look like a button.
   Make it an actual `<button>`.
5. **Alt text, both directions.** The hero image (`/hero.png`) is meaningful content and has no
   `alt` at all — give it a real, descriptive `alt`. The swoosh graphic (`/decorative-swoosh.png`)
   is purely decorative — give it `alt=""` so it drops out of the accessibility tree instead of
   being announced as an unlabeled image.
6. **Hide the internal note properly.** The `Internal build 4.7.2` paragraph is hidden with
   `opacity: 0` — invisible to sighted users, but a screen reader still reads it in full, because
   opacity has no effect on the accessibility tree. Hide it with the `hidden` attribute (or
   `aria-hidden="true"`) instead.

You shouldn't need any new imports or new components — every fix here is a tag or attribute
change on markup that's already there.
