import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        "A teammate attaches a shadow root with `mode: \"closed\"` on a `<x-secrets>` element, reasoning that it keeps the element's internal markup and any embedded config out of reach of other scripts on the page. What's wrong with that reasoning?",
      choices: [
        { id: 'a', text: 'Nothing — closed mode is exactly the platform mechanism for hiding a subtree from other same-page scripts.' },
        { id: 'b', text: "Closed mode only blocks the outside world's ordinary `element.shadowRoot` access. It isn't a security boundary — script on the same page can still reach the shadow tree through other means, and dev tools and testing utilities that outside code should be able to use lose access too, for no real safety gain." },
        { id: 'c', text: "Closed mode has no effect at all in modern browsers; it's a legacy no-op kept for backward compatibility." },
      ],
      correctChoiceId: 'b',
      explanation:
        'Shadow DOM encapsulation is a structure and styling boundary, not a security boundary — anything sensitive still needs to not be shipped to the client at all. `closed` mainly costs you tooling access (devtools, Testing Library, other libraries) without stopping a determined script on the same page.',
    },
    {
      id: 'q2',
      prompt:
        'A design-system `<ds-tooltip>` wraps a native `<button>` trigger inside its shadow root. Clicking anywhere on the host, or calling `.focus()` on it, should move keyboard focus onto that inner button — the caller shouldn\'t need to know the button exists.',
      choices: [
        { id: 'a', text: 'Add `tabindex="0"` to the host element and a manual `click` listener that calls `.focus()` on the inner button.' },
        { id: 'b', text: 'Pass `{ delegatesFocus: true }` to `attachShadow`, which makes focusing or clicking the host delegate focus to the first focusable descendant inside the shadow tree.' },
        { id: 'c', text: "Use `::slotted(button) { pointer-events: auto; }`, since focus delegation is a CSS concern." },
      ],
      correctChoiceId: 'b',
      explanation:
        "delegatesFocus exists for exactly this: a host wrapping a real focusable control. Without it, custom elements aren't focusable by default and clicking the host does nothing to move focus inward.",
    },
    {
      id: 'q3',
      prompt:
        "A component's shadow root has `<slot name=\"icon\"><svg class=\"default-icon\">...</svg></slot>`. A consumer renders `<x-button><svg slot=\"icon\" class=\"custom\">...</svg>Save</x-button>`. What ends up displayed in the icon slot, and why?",
      choices: [
        { id: 'a', text: "The consumer's custom `<svg>`, because a slot's own children are only fallback content, shown only when nothing is assigned to that slot." },
        { id: 'b', text: 'Both SVGs, stacked, because slotting appends rather than replaces.' },
        { id: 'c', text: "The component's default icon, because assigned content only overrides a slot's fallback if `slotchange` is manually wired up." },
      ],
      correctChoiceId: 'a',
      explanation:
        "A slot's own markup is fallback-only. As soon as anything is assigned to it (an element with a matching slot attribute), the fallback stops rendering and the assigned node renders in its place — no JS required.",
    },
    {
      id: 'q4',
      prompt:
        "A test does `render(<MyWrapper />)` where `MyWrapper` renders a custom element with an open shadow root, then calls `screen.getByRole(\"button\")` expecting to find a button that's inside that shadow root. It fails with \"Unable to find role\". Why?",
      choices: [
        { id: 'a', text: "Testing Library's queries only search light DOM by default — matching how `document.querySelector` behaves — so a query needs to be scoped into the shadow root explicitly, e.g. `within(host.shadowRoot!).getByRole(\"button\")`." },
        { id: 'b', text: "getByRole doesn't work on custom elements at all, regardless of shadow DOM." },
        { id: 'c', text: 'The button needs `role="button"` added explicitly; native `<button>` elements lose their implicit role inside a shadow root.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "Shadow DOM's scoping applies to queries the same way it applies to CSS — nothing about testing-library special-cases it. Get a reference to the host, then scope into `host.shadowRoot` for anything inside.",
    },
    {
      id: 'q5',
      prompt:
        "A component library ships every instance's styles as a fresh `<style>` tag written into `shadowRoot.innerHTML`. At 3 instances this is invisible; a customer renders 4,000 rows of a component built this way and reports the page is sluggish to render. What's the highest-leverage fix, and why?",
      choices: [
        { id: 'a', text: 'Switch to inline `style` attributes on every element, since `<style>` tags are inherently slower than inline styles.' },
        { id: 'b', text: 'Build one `CSSStyleSheet` via the constructable stylesheets API and assign it to every root\'s `adoptedStyleSheets`, so the CSS is parsed once and shared, instead of once per instance.' },
        { id: 'c', text: 'Move all styling to `::part()` rules written once in the parent document, since document-level CSS is always cheaper than shadow-root CSS.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Per-instance <style> tags mean the browser parses and stores the same CSS text N times. adoptedStyleSheets lets N shadow roots share one parsed CSSStyleSheet object — the standard fix component libraries use once instance counts get large.",
    },
    {
      id: 'q6',
      prompt:
        'A team server-renders a page with `<x-card><template shadowrootmode="open">...</template>...</x-card>` for fast first paint, and separately writes a Vitest suite (jsdom) asserting `host.shadowRoot` is non-null immediately after rendering that same HTML string via `element.innerHTML = html`. The assertion fails in jsdom but the real browser renders correctly. Why the mismatch, and what does it imply for the test?',
      choices: [
        { id: 'a', text: 'jsdom has a bug that will likely be fixed soon; the test is correct and should be left as-is.' },
        { id: 'b', text: "Declarative Shadow DOM is only ever attached by the browser's streaming HTML parser as it parses a document or a parser-inserted fragment — setting `.innerHTML` doesn't invoke that parser step, and jsdom doesn't implement DSD parsing at all. The test needs a manual hydration step (find the unattached template, call attachShadow, move its content in) to model what a real browser's initial parse does for free." },
        { id: 'c', text: 'The mismatch means `shadowrootmode` only works when the mode is `"closed"`, not `"open"`.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "DSD is a parser-level behavior, not an innerHTML behavior, in real browsers — and jsdom doesn't implement it at all. Anything that needs to test or polyfill DSD outside a real browser's initial parse (jsdom, or a browser building the tree via innerHTML/DOMParser instead of navigation) has to hydrate it manually.",
    },
  ],
};
