import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A new internal dashboard needs no design-system reuse across other apps, just fast, maintainable styling for one Vite + React app. What fits the 2026 default best?',
      choices: [
        { id: 'a', text: 'Tailwind v4 utility classes, configured with @theme in a single CSS file.' },
        { id: 'b', text: 'styled-components, since co-locating styles with components is still best practice.' },
        { id: 'c', text: 'A hand-rolled CSS-in-JS runtime, to avoid a build-time dependency.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'Tailwind v4 (CSS-first @theme config, no separate JS config file, first-class container queries) is the utility-first default for new Vite/React apps in 2026. styled-components has been in maintainer-declared maintenance mode since March 2025 and is not recommended for new adoption.',
    },
    {
      id: 'q2',
      prompt:
        "A component you're porting to be a React Server Component currently styles itself with styled-components' `styled.div` API. What has to change?",
      choices: [
        {
          id: 'a',
          text: 'Nothing — styled-components works identically whether a component renders on the server or the client.',
        },
        {
          id: 'b',
          text: 'It needs a "use client" boundary (or a rewrite to a zero-runtime/CSS approach) because styled-components injects styles at render time in a browser runtime that a Server Component does not have.',
        },
        { id: 'c', text: 'Only the import path changes, from `styled-components` to `styled-components/server`.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Runtime CSS-in-JS relies on client-side style injection during render. A Server Component has no client runtime to inject into, so the component either needs a "use client" boundary (defeating the purpose of making it a Server Component) or a build-time styling approach instead.',
    },
    {
      id: 'q3',
      prompt:
        'You want a component library`s design tokens to be swappable at runtime (e.g. a white-label product with per-tenant colors) without shipping a different JS bundle per tenant. Which mechanism fits?',
      choices: [
        { id: 'a', text: 'CSS custom properties (e.g. --brand-accent), overridden per tenant via an attribute or class on a wrapper element.' },
        { id: 'b', text: 'A separate Tailwind @theme block compiled into a separate CSS file per tenant, shipped alongside the JS bundle.' },
        { id: 'c', text: 'Recompiling the app with a different tailwind.config.js value per tenant.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'CSS custom properties resolve at paint time in the browser, so the same compiled CSS and JS can serve every tenant — only the variable values (set via a data attribute, class, or inline style on a wrapper) differ. This is exactly the mechanism the theming exercise in this lesson uses for data-theme.',
    },
    {
      id: 'q4',
      prompt:
        'A `<Card>` component needs to render two columns of content when it has enough horizontal space, and one column when it does not — regardless of the viewport width, since it might sit in a wide main area or a narrow sidebar.',
      choices: [
        { id: 'a', text: 'A `ResizeObserver` in a `useEffect` that measures the card and sets a `narrow`/`wide` state.' },
        { id: 'b', text: 'A CSS container query (@container) on the card\'s own containing element, styling by the container\'s width rather than the viewport\'s.' },
        { id: 'c', text: 'A media query on the viewport width, since that\'s the only thing CSS can query.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Container queries size an element based on its containing block, not the viewport — the exact case a media query can't handle. With Baseline-wide browser support and Tailwind v4 shipping container-query variants as core utilities, this no longer needs a ResizeObserver and a re-render.",
    },
    {
      id: 'q5',
      prompt:
        'A `<Button className="p-8">` should let the caller\'s padding override the component\'s own default padding class. Plain string concatenation (`` `${defaultClasses} ${className}` ``) sometimes fails to achieve that. Why?',
      choices: [
        {
          id: 'a',
          text: "Tailwind's cascade order depends on the order utilities are defined in the generated stylesheet, not the order class names appear in a className string — so a later class in the string doesn't reliably win in CSS.",
        },
        { id: 'b', text: 'React ignores any className prop passed after the second render.' },
        { id: 'c', text: "It always works — there's no real problem here." },
      ],
      correctChoiceId: 'a',
      explanation:
        "Which utility wins when two conflict is decided by stylesheet order, not by where the class name sits in a className string. A merge utility (tailwind-merge, or the hand-rolled version in this lesson's exercise) resolves the conflict explicitly by dropping the earlier, same-property class instead of hoping source order matches stylesheet order.",
    },
    {
      id: 'q6',
      prompt:
        "You're deciding whether to adopt shadcn/ui for a new project's component layer in September 2026. What's an accurate statement about its current defaults?",
      choices: [
        {
          id: 'a',
          text: 'shadcn/ui publishes a versioned npm package of pre-built components; you install it like any other UI library.',
        },
        {
          id: 'b',
          text: "shadcn/ui's CLI copies component source into your repo (you own and edit it directly), and as of July 2026 new projects default to building those components on Base UI rather than Radix UI, though Radix remains fully supported.",
        },
        { id: 'c', text: 'shadcn/ui dropped Tailwind entirely in 2026 in favor of vanilla-extract.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "shadcn/ui's defining trait is that it isn't an installed dependency — its CLI copies component source files into your project. The July 2026 change was to the underlying accessibility/behavior primitives (Base UI became the default over Radix, which is still supported), not to the copy-the-source model or its Tailwind-based styling.",
    },
  ],
};
