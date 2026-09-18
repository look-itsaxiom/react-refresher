import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'Your design system wraps its reset, base styles, and components in `@layer reset, base, components;`. A consumer app writes a plain, unlayered `.btn { padding: 0; }` with no `!important`. What happens, and why?',
      choices: [
        { id: 'a', text: "It loses to any padding rule inside `components` unless the app's rule has higher specificity, because layers don't change how specificity works." },
        { id: 'b', text: "It wins over any padding rule in `components`, `base`, or `reset`, regardless of specificity, because unlayered normal declarations beat every layered normal declaration." },
        { id: 'c', text: "It's ignored entirely, because a plain rule outside any `@layer` block doesn't participate in the cascade once layers are declared." },
      ],
      correctChoiceId: 'b',
      explanation:
        'Normal (non-important) unlayered declarations always beat normal declarations in any layer, no matter the specificity gap. This is exactly why Tailwind v4 wraps its own output in layers: it leaves plain application CSS free to override without a specificity fight.',
    },
    {
      id: 'q2',
      prompt:
        'You need a `<Sidebar>` component to switch from icon-only to icon-plus-label once it has enough width to render both, and it can appear in a narrow rail or a wide drawer depending on the page.',
      choices: [
        { id: 'a', text: 'A `@media (min-width: ...)` query, since that\'s the standard way to make layout responsive.' },
        { id: 'b', text: 'A `ResizeObserver` that measures the sidebar and toggles a class in state.' },
        { id: 'c', text: "`container-type: inline-size` on the sidebar's wrapper, with an `@container (min-width: ...)` rule targeting its own width, not the viewport's." },
      ],
      correctChoiceId: 'c',
      explanation:
        "The sidebar's own available width, not the viewport's, is what should drive this — the same component might be narrow or wide independent of screen size. Container queries handle exactly this case natively, without JS measurement or re-renders.",
    },
    {
      id: 'q3',
      prompt:
        'A base stylesheet defines `:where(h1, h2, h3) { margin-block: 0; }` instead of `h1, h2, h3 { margin-block: 0; }`. What does using `:where()` buy here?',
      choices: [
        { id: 'a', text: 'Nothing observable — `:where()` is purely a shorthand for grouping selectors, identical to a plain selector list.' },
        { id: 'b', text: 'The rule contributes zero specificity, so a consumer can override it with a single class like `.title { margin-block: 1rem; }` instead of needing to out-specify three type selectors.' },
        { id: 'c', text: 'It makes the rule apply only inside a `@scope` block.' },
      ],
      correctChoiceId: 'b',
      explanation:
        ':where() always contributes [0,0,0] to specificity regardless of its argument, unlike :is()/:not()/:has(), which take the specificity of their most specific argument. That makes it the right tool for base styles meant to be trivially overridden.',
    },
    {
      id: 'q4',
      prompt:
        'You want a form\'s submit button to visually disable itself whenever any required field inside the form is left empty, with no state lifted into a component and no re-render on every keystroke.',
      choices: [
        { id: 'a', text: 'A `form:has(:invalid) .submit { opacity: 0.5; pointer-events: none; }` rule, reading validity straight from the DOM.' },
        { id: 'b', text: 'A `useEffect` that watches every input\'s value and sets a `disabled` boolean.' },
        { id: 'c', text: 'A `MutationObserver` on the form watching for attribute changes.' },
      ],
      correctChoiceId: 'a',
      explanation:
        ":has() lets a selector match a parent based on a descendant's state — here, the browser's own validity tracking — with no JS involved and no extra renders. Reach for state and effects only when the result needs to drive behavior, not just appearance.",
    },
    {
      id: 'q5',
      prompt:
        'A gallery wants clicking a thumbnail to morph it into a full-size hero image, growing and moving smoothly to its new position and size, without hand-writing FLIP-style transform math.',
      choices: [
        { id: 'a', text: 'CSS `transition: all 0.3s` on the image element, since any CSS property change animates automatically.' },
        { id: 'b', text: "Tag the thumbnail and the hero image with the same `view-transition-name` and trigger the DOM swap inside a Transition, using React's `<ViewTransition>` (or `document.startViewTransition` directly) to let the browser compute the morph." },
        { id: 'c', text: 'requestAnimationFrame, manually interpolating position and size every frame.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "A plain transition can't animate an element being unmounted in one place and mounted in another — that's what the View Transitions API is for. Matching view-transition-name values across the before/after DOM tells the browser which elements correspond, and it computes the shared-element morph itself. React 19.3's <ViewTransition> wraps this API for transition-driven mount/unmount/resize.",
    },
    {
      id: 'q6',
      prompt:
        'You want a scroll-triggered reveal animation (cards fading in as they enter the viewport) for a marketing page shipping in September 2026. What should shape your approach?',
      choices: [
        { id: 'a', text: 'Ship `animation-timeline: view()` as the only mechanism — it\'s Baseline, so every major browser runs it.' },
        { id: 'b', text: "Ship `animation-timeline: view()` as progressive enhancement (the element is visible without it), because Firefox stable still ships scroll-driven animations behind a flag as of mid-2026, so it isn't Baseline yet." },
        { id: 'c', text: "Skip CSS entirely and use an `IntersectionObserver`, since CSS still can't drive animations from scroll position." },
      ],
      correctChoiceId: 'b',
      explanation:
        'Chrome and Safari (as of Safari 26, September 2025) support animation-timeline: scroll()/view(), but Firefox stable still gates it behind a flag as of mid-2026 even though it is an Interop 2026 priority — so it is not Baseline. Write it so the un-animated state (fully visible) is a fine fallback, rather than a broken layout.',
    },
  ],
};
