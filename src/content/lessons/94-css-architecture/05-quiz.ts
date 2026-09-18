import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Quiz: CSS architecture',
  questions: [
    {
      id: 'unlayered-vs-layered',
      prompt:
        'A third-party widget ships an unlayered `.widget-title { color: red; }`. Your app has ' +
        '`@layer utilities { .text-blue { color: blue; } }` applied to the same element, later in the ' +
        'document. Which color wins, and why?',
      choices: [
        { id: 'blue-later', text: 'Blue, because `utilities` is a later layer and layers beat earlier ones' },
        { id: 'red-unlayered', text: 'Red, because unlayered CSS always beats layered CSS regardless of specificity or order' },
        { id: 'blue-specificity', text: 'Blue, because a class selector in `utilities` is more specific than the unlayered class selector' },
        { id: 'depends-source-order', text: 'Whichever rule appears later in the actual source order' },
      ],
      correctChoiceId: 'red-unlayered',
      explanation:
        'Unlayered normal-importance declarations always win over any layered declaration, no matter how ' +
        'the layers are ordered or how specific the layered selector is. This is why third-party CSS is ' +
        'dangerous by default: import it into a named layer (`@import "widget.css" layer(vendor);`) so your ' +
        'own layered styles can actually override it.',
    },
    {
      id: 'important-inversion',
      prompt:
        'You have `@layer reset, utilities;`. Both layers contain an `!important` declaration for the same ' +
        'property on the same element. Which one wins?',
      choices: [
        { id: 'utilities-important', text: 'The `utilities` declaration, because it is the later layer' },
        { id: 'reset-important', text: 'The `reset` declaration, because `!important` inverts layer precedence' },
        { id: 'specificity-decides', text: 'Whichever selector is more specific, `!important` does not affect layer order' },
        { id: 'error', text: 'This is invalid CSS and the browser ignores both declarations' },
      ],
      correctChoiceId: 'reset-important',
      explanation:
        '`!important` inverts layer precedence: an `!important` in an earlier-declared layer beats an ' +
        '`!important` in a later one. This is the opposite of normal-importance rules, and it is why a ' +
        'lesson\'s recommended policy bans `!important` everywhere except a dedicated escape-hatch layer.',
    },
    {
      id: 'is-vs-where',
      prompt:
        'You want a reset rule that matches `h1, h2, h3` but must never win a specificity fight against any ' +
        'later rule, even one written by a careless contributor. Should you write `:is(h1, h2, h3) { … }` or ' +
        '`:where(h1, h2, h3) { … }`?',
      choices: [
        { id: 'is', text: '`:is()` — it is the more modern, more widely supported selector' },
        { id: 'where', text: '`:where()` — it always contributes zero specificity, `:is()` takes the specificity of its most specific argument' },
        { id: 'either', text: 'Either works identically for specificity purposes' },
        { id: 'not', text: '`:not()` — negation is the correct tool for "never win"' },
      ],
      correctChoiceId: 'where',
      explanation:
        '`:is()` and `:not()`/`:has()` take the specificity of their most specific argument (so `:is(#a, .b)` ' +
        'is as specific as `#a`), while `:where()` always contributes `[0,0,0]` regardless of what is inside ' +
        'it. For a reset that must lose every fight, `:where()` is the only one of the two that guarantees it.',
    },
    {
      id: 'apply-discouraged',
      prompt:
        'A teammate proposes `.btn { @apply px-4 py-2 rounded bg-accent text-white; }` in Tailwind 4 so the ' +
        'class can be reused across several hand-written HTML fragments. What is the better default in a ' +
        'React codebase, and why?',
      choices: [
        { id: 'keep-apply', text: 'Keep it — `@apply` is the intended way to deduplicate utility strings' },
        { id: 'extract-component', text: 'Extract a `<Button>` React component instead — `@apply` re-introduces the specificity and ordering coupling utilities exist to avoid, and reuse belongs at the component layer in a component framework' },
        { id: 'use-important', text: 'Add `!important` to each `@apply`\'d property so it always wins' },
        { id: 'move-to-reset', text: 'Move the rule into the `reset` layer so it always loses ties instead' },
      ],
      correctChoiceId: 'extract-component',
      explanation:
        'In a component-based framework, "I want to reuse a set of classes" is almost always better solved by ' +
        'a component than by a CSS abstraction. `@apply` compiles utilities back into a normal, specificity-bearing ' +
        'selector, which is exactly what utility-first architecture is trying to avoid. Tailwind\'s own v4 guidance ' +
        'discourages it for anything beyond trivial, one-off cases.',
    },
    {
      id: 'css-modules-vs-utilities',
      prompt:
        'A component has a dozen interacting boolean props (`isOpen`, `isDragging`, `hasError`, `isDisabled`, ' +
        '…) each toggling several style properties. What is the strongest signal to reach for CSS Modules (or ' +
        'a variant-builder helper) instead of inline utility classes?',
      choices: [
        { id: 'modules-faster', text: 'CSS Modules render faster than utility classes at runtime' },
        { id: 'state-heavy', text: 'Heavy conditional/state-driven styling reads better as named classes toggled by logic than as a long ternary-laden utility string' },
        { id: 'modules-required-react', text: 'React requires CSS Modules for any component with more than one prop' },
        { id: 'utilities-deprecated', text: 'Utility-first frameworks are being deprecated in favor of CSS Modules' },
      ],
      correctChoiceId: 'state-heavy',
      explanation:
        'Utilities are strongest for layout and one-off visual tweaks; once a component has many interacting ' +
        'states, a utility string turns into an unreadable pile of conditionals. Named classes (BEM, CSS ' +
        'Modules, or a variant-builder like the one in this lesson\'s exercise) keep the state-to-style mapping ' +
        'legible. Neither approach is faster or deprecated — it is a readability and maintainability trade-off.',
    },
    {
      id: 'legacy-migration',
      prompt:
        'You inherit a large legacy Sass/BEM codebase and want to start shipping new components with cascade ' +
        'layers without a big-bang rewrite. What is the recommended first step?',
      choices: [
        { id: 'rewrite-all', text: 'Rewrite every legacy selector to be `:where()`-wrapped before writing any new CSS' },
        { id: 'wrap-legacy-layer', text: 'Import the entire legacy stylesheet into its own early layer (e.g. `layer(legacy)`), then write new components in later layers so they can override it for free' },
        { id: 'important-everywhere', text: 'Add `!important` to every new component rule so it beats legacy CSS regardless of layers' },
        { id: 'shadow-dom-legacy', text: 'Move the legacy stylesheet into a Shadow DOM boundary' },
      ],
      correctChoiceId: 'wrap-legacy-layer',
      explanation:
        'Wrapping the legacy stylesheet in its own layer, declared early in the `@layer` statement, means any ' +
        'later layer automatically outranks it — no specificity fight, no rewrite. You can then migrate ' +
        'component-by-component, deleting the legacy rule once its React replacement ships, instead of ' +
        'converting the whole file at once.',
    },
  ],
};
