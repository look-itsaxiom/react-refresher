import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A LitElement sets three different `@property()` fields inside one click handler. How many times does `render()` run, and why?',
      choices: [
        { id: 'a', text: 'Three times — each property setter calls requestUpdate, which renders immediately.' },
        {
          id: 'b',
          text: 'Once — each setter calls requestUpdate, which schedules a microtask; three synchronous calls in the same tick collapse into one scheduled render.',
        },
        { id: 'c', text: 'Zero — LitElement only re-renders when an attribute changes, not a property.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'requestUpdate batches via a microtask precisely so a handler that touches several reactive properties in a row still produces one render, not one per assignment — the same batching intuition React applies to setState calls inside one event handler.',
    },
    {
      id: 'q2',
      prompt:
        'Why does reflecting a property to its attribute (`reflect: true`) need a guard flag around the `setAttribute` call, given that `attributeChangedCallback` also writes the property back on an attribute change?',
      choices: [
        {
          id: 'a',
          text: "It doesn't — browsers only fire attributeChangedCallback when the attribute's value actually changed, so the round trip can never loop.",
        },
        {
          id: 'b',
          text: "Without a guard, the property's own reflect step calling setAttribute triggers attributeChangedCallback, which sets the property again, which reflects again — an infinite loop (or at least redundant work) unless something short-circuits the second leg.",
        },
        { id: 'c', text: 'The guard is only needed in Safari, which fires attributeChangedCallback asynchronously.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Property → attribute → property → attribute is a real cycle the moment both directions are wired up. Lit (and this lesson's mini ReactiveElement) breaks it with an internal flag set for the duration of the reflect-triggered setAttribute call, which attributeChangedCallback checks and bails out on.",
    },
    {
      id: 'q3',
      prompt:
        'A team defines one `class Card extends HTMLElement {}` and tries to `customElements.define(\'x-card\', Card)` and later `customElements.define(\'x-card-compact\', Card)` for a visually distinct variant. What happens?',
      choices: [
        { id: 'a', text: 'Both tags work fine and share the same class, which is the recommended way to alias an element under two names.' },
        {
          id: 'b',
          text: 'The second `define` throws — a given constructor can only ever be registered under one tag name in a given custom element registry.',
        },
        { id: 'c', text: 'The first definition is silently replaced by the second.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "The CustomElementRegistry rejects reusing a constructor under a second name. Two visually distinct variants need two distinct classes (even if one just extends the other), or one class read a variant off a property/attribute at render time — which is also exactly why this lesson's exercises define a fresh subclass inside a suffixed define() call rather than reusing one module-level class across tags.",
    },
    {
      id: 'q4',
      prompt:
        'Why does `lit-html` — or a hand-rolled equivalent — bind a dynamic text value by setting a Text node\'s `.data` property, rather than concatenating it into an HTML string and reassigning `innerHTML`?',
      choices: [
        {
          id: 'a',
          text: 'Performance only — .data is marginally faster than innerHTML, but both are equally safe against injected markup.',
        },
        {
          id: 'b',
          text: "Both safety and identity: .data is never parsed as HTML (a string like '<img onerror=...>' stays inert text, closing an XSS hole for free), and it mutates an existing node instead of tearing down and recreating the whole subtree on every render.",
        },
        { id: 'c', text: 'It only matters for SSR; in the browser both approaches behave identically.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "innerHTML re-parses its entire argument as markup every time, which is both how injected user content becomes executable and why anything with focus, scroll position, or a running <video> inside gets destroyed and recreated on every update. Text-node data assignment sidesteps both problems structurally, not by remembering to escape.",
    },
    {
      id: 'q5',
      prompt: 'What is the actual reason React historically scored poorly on Custom Elements Everywhere, before React 19?',
      choices: [
        {
          id: 'a',
          text: 'React refused to render any tag name containing a hyphen at all.',
        },
        {
          id: 'b',
          text: "React only ever passed data to custom elements as string attributes and had no built-in way to listen for a custom event — so an element expecting a real object or array as a property, or emitting a CustomEvent instead of a bubbling DOM event, didn't get useful data or get listened to correctly.",
        },
        { id: 'c', text: 'React required every custom element to be wrapped in ReactDOM.createPortal to render at all.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "React rendered the element, but everything past `setAttribute`-able strings was a gap: an object- or array-typed property arrived as `[object Object]` or a stringified array, and a component's own CustomEvent had no `onFoo`-style prop to hook into. React 19 (next lesson) closes the property side of this gap.",
    },
    {
      id: 'q6',
      prompt:
        'A team is building a component library used only inside one large, React-only internal app, with no plan to ship it to any other team or framework. Is reaching for Lit (or Stencil) the right call?',
      choices: [
        {
          id: 'a',
          text: 'Yes — any design system should be framework-agnostic web components by default, regardless of who consumes it.',
        },
        {
          id: 'b',
          text: 'Probably not — the main payoff of web components is cross-framework portability and long-term platform stability; a React-only consumer instead pays Shadow DOM\'s styling-isolation cost and loses React\'s synthetic events and context propagation into the component, for no portability benefit.',
        },
        { id: 'c', text: 'Yes, but only if the components use `.prop=` bindings instead of attributes.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Web components earn their keep when more than one framework (or no framework at all) needs to consume the same implementation, or when a component has to survive a framework migration. A single React app gets little from that trade and gives up real ergonomics — plain React components remain the better default there.",
    },
  ],
};
