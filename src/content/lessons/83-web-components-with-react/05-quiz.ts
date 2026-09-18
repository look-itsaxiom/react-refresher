import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A custom element class defines `max = 5` as a plain field. A React component renders `<x-widget max={10} />`. What does React 19 do, client-side?',
      choices: [
        { id: 'a', text: 'Calls `el.setAttribute(\'max\', \'10\')`, because `max` is a number and numbers are always attributes.' },
        { id: 'b', text: 'Sets `el.max = 10` as a real property, because the element instance already has a `max` field to match against.' },
        { id: 'c', text: 'Does nothing, because custom elements only accept attributes from React, not properties.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'React 19 checks the live element instance for a matching property before falling back to an attribute. Since `XWidget` already defines `max`, React assigns it as a property (`el.max = 10`, staying a number) rather than stringifying it into an attribute.',
    },
    {
      id: 'q2',
      prompt:
        'A component passes `active={false}` to a custom element whose class does **not** define an `active` property. What ends up on the element?',
      choices: [
        { id: 'a', text: 'The attribute `active=""` is added, since `false` still needs to be represented somehow.' },
        { id: 'b', text: 'No `active` attribute is set (or an existing one is removed), the same as `false` behaves on any built-in boolean attribute.' },
        { id: 'c', text: 'A property `el.active = false` is created dynamically on the instance.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'With no matching instance property, React falls back to attribute handling, which follows the standard boolean-attribute idiom: `true` sets an empty attribute (present, no value), and `false` (like `null`/`undefined`) omits or removes it. React never invents a new own property on an arbitrary object.',
    },
    {
      id: 'q3',
      prompt:
        'A web component dispatches `CustomEvent(\'item-selected\', { detail })`. Which prop name, on the JSX call site, will make React 19 attach a listener for that exact event via its `on*` exact-match binding?',
      choices: [
        { id: 'a', text: '`onItemSelected` — React converts kebab-case DOM events to camelCase automatically.' },
        { id: 'b', text: '`onitem-selected` — the exact string left after removing `on` must equal the event type, verbatim.' },
        { id: 'c', text: 'Neither; custom events can never be bound with an `on*` prop, only through a manual `ref` + `addEventListener`.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'React 19\'s auto-binding for unrecognized elements uses the literal remainder of the prop name as the event type — no case conversion. `onitem-selected` matches `item-selected` exactly; `onItemSelected` does not, because `ItemSelected` is a different string than `item-selected`. Hyphenated attribute names are valid JSX, same as `data-*`/`aria-*`.',
    },
    {
      id: 'q4',
      prompt:
        'A design system\'s public wrapper wants to expose `onSelectionChange(id: string)` as its callback prop name, even though the underlying custom element dispatches `selection-changed`. What\'s the right way to wire that up?',
      choices: [
        { id: 'a', text: 'Rename the prop to `onselection-changed` so React\'s exact-match binding picks it up directly.' },
        { id: 'b', text: 'Attach the listener manually — a `ref` callback or a `useEffect` calling `addEventListener(\'selection-changed\', ...)` — and call `onSelectionChange` from inside that handler, with cleanup.' },
        { id: 'c', text: 'It\'s not possible; the public prop name must match the DOM event name exactly.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Exact-match auto-binding only helps when you\'re willing to spell the prop after the DOM event\'s literal name. A component\'s public API almost never wants that (`onSelectionChange` reads better and hides the implementation detail), so the standard move is a manual `addEventListener`/`removeEventListener` pair in an effect or ref callback that translates the raw event into whatever callback shape the wrapper wants to expose.',
    },
    {
      id: 'q5',
      prompt:
        'A React app server-renders a page containing `<x-badge count={3} tone={{ scheme: \'warm\' }} />`. What appears in the HTML `renderToString` produces for `tone`?',
      choices: [
        { id: 'a', text: '`tone="[object Object]"`, because SSR stringifies every prop the same way attributes always have.' },
        { id: 'b', text: 'Nothing — `tone` is omitted entirely, because SSR has no DOM to check for a matching property and only emits attributes for primitive values.' },
        { id: 'c', text: 'A serialized JSON attribute, `tone=\'{"scheme":"warm"}\'`, that the client parses back into an object during hydration.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Server rendering can\'t inspect a live element instance, so it uses a type-based rule instead: primitives (`string`/`number`/`true`) become attributes, and everything else — objects, functions, and `false` — is left out of the markup. `count={3}` becomes `count="3"`; the object prop for `tone` simply isn\'t there until the client re-renders against the real element and can assign it as a property.',
    },
    {
      id: 'q6',
      prompt:
        'A team is choosing between a plain React component and a Lit-based custom element for a new "date range picker" used only inside their React product, with no other consumers. What\'s the better call, and why?',
      choices: [
        { id: 'a', text: 'The custom element, because React 19\'s property/attribute handling makes web components strictly better than React components now.' },
        { id: 'b', text: 'The plain React component, because the picker has no reason to leave the React tree — a web component adds JSX typing overhead, an unregistrable global registry, and an opaque node the compiler and context can\'t see into, for no cross-framework benefit.' },
        { id: 'c', text: 'It doesn\'t matter; performance is identical either way, so pick whichever the team is more comfortable authoring.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'React 19 made custom elements *usable* from React, not *preferable* to React components for React-only work. A component that never needs to run outside this app gets nothing from being a custom element and loses React-specific integration (context, the compiler\'s optimizations, error boundaries seeing inside it) plus needs a typed wrapper and a permanent global tag registration. Reach for a custom element when something has to work outside this one React tree — not by default.',
    },
  ],
};
