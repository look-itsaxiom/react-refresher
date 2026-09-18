import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A token tree has `semantic.color.danger.$value` set directly to `"#dc2626"` instead of an alias like `"{color.red.600}"`. Why is that a problem worth linting for, even though the CSS output is identical either way?',
      choices: [
        { id: 'a', text: "It isn't a real problem — a semantic token's job is just to have a name, its value doesn't matter." },
        {
          id: 'b',
          text: 'A raw value at the semantic tier breaks the reason semantic tokens exist: when the primitive palette changes (a rebrand, a contrast fix), every semantic token that aliases it updates automatically, but this one is now an orphaned literal that someone has to remember to update by hand.',
        },
        { id: 'c', text: "It's a problem because CSS custom properties can't hold hex colors directly, only aliases." },
      ],
      correctChoiceId: 'b',
      explanation:
        'Semantic tokens exist to route to a primitive by name, so changing the primitive changes everything downstream. A hardcoded value at that tier silently opts one token out of that propagation — it will drift from the palette the next time it changes, and nothing will flag it.',
    },
    {
      id: 'q2',
      prompt:
        "You're deciding how to theme a component library's dark mode. The design only ever needs exactly two states (light and dark, no brand variants, no high-contrast mode) and every themed value is a straightforward light/dark swap. Where does `light-dark()` fit best?",
      choices: [
        {
          id: 'a',
          text: "It replaces custom properties entirely — there's no reason to define --color-bg as a variable if light-dark() can pick the value inline.",
        },
        {
          id: 'b',
          text: "It's a good fit here: set color-scheme on the themed root, then write background: light-dark(#fff, #171a21) directly, skipping a --color-bg variable and a second full rule block for the dark override.",
        },
        {
          id: 'c',
          text: "It doesn't apply — light-dark() only works with prefers-color-scheme, not with a manual .dark class or [data-theme] toggle.",
        },
      ],
      correctChoiceId: 'b',
      explanation:
        "light-dark() is exactly for the plain two-value swap case: it collapses a value and its dark override into one declaration. It works with any mechanism that ends up setting color-scheme on an ancestor — a prefers-color-scheme default and a manual .dark/[data-theme] override both qualify. It stops being the right tool once you need three-plus themes or a value that isn't a simple binary swap; then you're back to a semantic custom property.",
    },
    {
      id: 'q3',
      prompt:
        'Your app sets the theme by toggling a `.dark` class on `<html>` inside a `useEffect` in your root React component, based on `localStorage`. Users on slow connections report a visible flash of the light theme before it switches to dark. What fixes it?',
      choices: [
        { id: 'a', text: 'Move the theme-detection logic into a useLayoutEffect instead of useEffect, since useLayoutEffect runs synchronously.' },
        {
          id: 'b',
          text: 'Add a tiny inline <script> in <head>, before the app bundle loads, that reads storage and sets the class/attribute synchronously — a React effect (even useLayoutEffect) only runs after your JS bundle has loaded and hydration has started, which is already too late to avoid the first, wrongly-themed paint.',
        },
        { id: 'c', text: 'Add a CSS transition on background-color so the flash is less jarring.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Any theme logic that lives inside React — even useLayoutEffect — can't run until your JS has loaded and React has started hydrating, by which point the browser has already painted with whatever default the HTML/CSS specified. The only fix is code that runs before that first paint: an inline script in <head>, not a React hook.",
    },
    {
      id: 'q4',
      prompt:
        "A user has Windows High Contrast Mode enabled (forced-colors: active). Your app's carefully tuned OKLCH brand palette and custom-property-driven theme mostly stop applying, replaced by a small fixed system palette. What's the correct response?",
      choices: [
        {
          id: 'a',
          text: "Treat it as a bug in your CSS and try to force your custom properties back with !important so your brand colors still show.",
        },
        {
          id: 'b',
          text: "That's forced-colors working as intended — it's a user accessibility override, not a rendering bug. Test under it, use forced-color-adjust: none only on the specific elements (like a custom-drawn control) where the forced palette actually breaks legibility or function, and leave the rest alone.",
        },
        { id: 'c', text: 'Detect forced-colors and show an error page telling the user to disable High Contrast Mode.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "forced-colors reflects a deliberate user or OS accessibility choice, not a browser bug to fight. The correct move is scoped: verify your UI stays usable under it, and reach for forced-color-adjust: none only where a genuinely custom-drawn element (not a native form control) needs to keep its own rendering to remain legible or operable.",
    },
    {
      id: 'q5',
      prompt:
        'A Style Dictionary-style build reads a DTCG token file where `semantic.color.hover` has `$value: "{semantic.color.hover}"` (it references itself). What should the build do, and why does it matter that it does that rather than silently emitting something?',
      choices: [
        { id: 'a', text: 'Emit `--semantic-color-hover: var(--semantic-color-hover);` — CSS custom properties handle self-reference fine at runtime.' },
        {
          id: 'b',
          text: "Throw a build-time error for the alias cycle. A self-referencing (or mutually referencing) alias has no defined value to resolve to, and CSS custom properties that reference themselves (directly or through a cycle) compute to their initial/inherited value silently — a build that doesn't catch this ships a token that looks fine in the pipeline but is invalid at runtime, with no error anywhere.",
        },
        { id: 'c', text: "Fall back to the token's $description as the value, since no numeric value was resolvable." },
      ],
      correctChoiceId: 'b',
      explanation:
        "An alias cycle is a build-time authoring error, and the failure mode if it's not caught is silent: a custom property whose computed value is its cycle (invalid at computed-value time) just falls back to its inherited or initial value with no console error, no failed build, no obvious signal — exactly the kind of bug that should be caught by the pipeline instead of by someone noticing a token rendered wrong in production.",
    },
    {
      id: 'q6',
      prompt:
        "A multi-tenant SaaS product wants each tenant's brand color applied at runtime from data stored in your own database — no separate build or deploy per tenant. Which approach fits, and what's the one thing to get right doing it?",
      choices: [
        {
          id: 'a',
          text: "Recompile the Tailwind @theme block server-side per tenant and serve a different compiled CSS bundle per tenant domain.",
        },
        {
          id: 'b',
          text: 'Set the tenant-specific values as CSS custom properties (via an inline `style` attribute or a small injected `<style>` block) on a wrapper element, using the tenant\'s own stored values; the one thing to get right is that this is untrusted-ish dynamic content going into CSS, so the Content-Security-Policy needs to deliberately allow it (a nonce on that inline style, or a style-src policy that covers it) rather than accidentally getting blocked or accidentally left too permissive.',
        },
        { id: 'c', text: "There's no way to do this without a build step, since CSS custom properties can't be set from JavaScript at runtime." },
      ],
      correctChoiceId: 'b',
      explanation:
        "Custom properties set at runtime (inline style or an injected <style> tag, scoped to a wrapper) are exactly the mechanism for per-tenant values from a database with a single shared bundle. The part that's easy to get wrong isn't the CSS — it's that a strict Content-Security-Policy will block unnoticed inline style unless you deliberately account for it (nonce or an explicit style-src allowance), so this has to be a conscious CSP decision, not an afterthought.",
    },
  ],
};
