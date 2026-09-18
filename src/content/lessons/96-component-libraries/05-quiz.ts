import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        "A new project runs `npx shadcn init` in September 2026 and gets Base UI-backed components instead of the Radix-backed ones an older tutorial shows. What actually changed, and what didn't?",
      choices: [
        {
          id: 'a',
          text: 'shadcn/ui dropped Radix support entirely; every existing Radix-based shadcn project needs to migrate immediately.',
        },
        {
          id: 'b',
          text: 'In July 2026, Base UI became the default primitive for new shadcn/ui projects after users preferred it roughly 2:1 in an opt-in survey; Radix remains fully supported for existing projects, and React Aria Components became a third selectable option the same month.',
        },
        { id: 'c', text: 'Nothing changed technically — it is purely a rebrand of the same Radix-based components under a new name.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'shadcn switched its *default* to Base UI in July 2026 based on user preference, while keeping Radix fully supported for projects already built on it, and adding React Aria Components as a third `--base` option. The underlying pattern (compound components, asChild/render, data-attribute state) is shared across all three — that is the actual portable knowledge, not which package a given `init` run picks.',
    },
    {
      id: 'q2',
      prompt:
        'A teammate argues: "We should hand-roll every component ourselves — Radix, Base UI, and React Aria are all just dependencies we do not control." Under this lesson\'s "own your primitives" analysis, what is the strongest counterargument?',
      choices: [
        {
          id: 'a',
          text: 'Headless libraries are always smaller in bundle size than anything hand-rolled, so the size argument alone settles it.',
        },
        {
          id: 'b',
          text: 'A hand-rolled Tabs or Menu re-derives the same roving-tabindex, typeahead, focus-trap, and dismiss-layer logic these libraries already solved and test; the team pays that cost once when adopting a library, versus paying it repeatedly (build, then maintain, then fix AT bugs) when hand-rolling.',
        },
        {
          id: 'c',
          text: 'It does not matter either way, since every headless library implements the exact same behavior with no differences worth comparing.',
        },
      ],
      correctChoiceId: 'b',
      explanation:
        'The lesson\'s framing is a cost comparison, not an absolute rule: hand-rolling has real value for genuinely trivial components, but composite widgets with real keyboard/focus/AT surface carry a maintenance cost that a maintained library already absorbed. Bundle size is a real but secondary factor, and libraries do differ (styling model, RSC support, i18n depth), so "no differences worth comparing" is false.',
    },
    {
      id: 'q3',
      prompt:
        'Why does a correct `Slot` implementation compose refs with a callback that returns a cleanup function, instead of just calling each ref with the node and calling each ref with `null` on unmount?',
      choices: [
        {
          id: 'a',
          text: "Because React 19's ref callbacks can themselves return a cleanup function (mirroring `useEffect`), and a composed ref must call each incoming ref's own returned cleanup rather than assuming every ref wants to be reset to `null` the same way.",
        },
        { id: 'b', text: 'Because calling a ref with `null` is deprecated in React 19 and will throw at runtime.' },
        { id: 'c', text: 'There is no real difference; the cleanup-returning form is only a stylistic preference with no behavioral impact.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "React 19 lets a ref callback return its own cleanup function, and some refs may rely on that cleanup running (rather than being called again with `null`) to release a resource correctly. A composed ref that only re-calls each ref with `null` on unmount would silently skip that cleanup path for any ref that defined one.",
    },
    {
      id: 'q4',
      prompt:
        'A `Tabs.Trigger` needs to render as a custom `<Link>` component from a router instead of a `<button>`, without losing `role="tab"`, `aria-selected`, or its click handler. Which pattern accomplishes this, and why not simply pass `as={Link}` and render `<As {...tabProps} />`?',
      choices: [
        {
          id: 'a',
          text: '`asChild`/`render`: the caller passes `<Tabs.Trigger asChild><Link to="/a">A</Link></Tabs.Trigger>`, and `Slot` merges the trigger\'s props onto the `Link` element the caller already fully controls (its own props, styling, and any router-specific attributes) rather than the primitive trying to construct a `<Link>` element itself.',
        },
        {
          id: 'b',
          text: 'A generic `as` prop is strictly better in every case, since it avoids the extra `Slot` merge logic entirely.',
        },
        {
          id: 'c',
          text: 'This is not solvable without forking the Tabs implementation to special-case every possible router library.',
        },
      ],
      correctChoiceId: 'a',
      explanation:
        'A polymorphic `as` prop (`<Trigger as={Link} to="/a">`) works for simple cases but gets awkward once the target component needs its own specific props (like `to`) that the primitive would have to somehow pass through generically. `asChild` sidesteps this: the caller writes the target element themselves, with full access to its real prop types, and `Slot` only has to merge, not construct.',
    },
    {
      id: 'q5',
      prompt:
        'A `Disclosure.Content` is styled with `className="content-hidden hidden:opacity-0"` using a Tailwind `data-[state=closed]:` variant, but the developer notices the class never applies because the element is unmounted while closed (no `forceMount`). What is the correct fix, and why?',
      choices: [
        {
          id: 'a',
          text: 'Add `forceMount` so the element stays mounted (with the `hidden` attribute) while closed, letting a `data-[state=closed]:` (or `hidden:`) Tailwind variant actually have an element to apply to; without `forceMount`, an unmounted element has no data attribute or class to match against at all.',
        },
        { id: 'b', text: 'Switch the library away from data-attribute styling entirely — data attributes cannot express a closed state.' },
        { id: 'c', text: 'Nothing needs to change; Tailwind variants apply to elements before they mount.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'Data-attribute styling only works on an element that exists in the DOM. The default (unmounted while closed) is correct for most uses, but any transition or "closed but visually present" styling needs `forceMount` plus the `hidden` attribute, so the element (and its `data-state`) is there for CSS to match against.',
    },
    {
      id: 'q6',
      prompt:
        "A component library ships `<Menu>`, `<Dialog>`, and `<Tooltip>`, all portaled into `document.body`. A code reviewer flags that none of the portal-rendered components have a `'use client'` directive, while the rest of the library does. Is that a bug?",
      choices: [
        {
          id: 'a',
          text: 'Yes, always — every exported component in a library must carry `\'use client\'` uniformly, with no exceptions.',
        },
        {
          id: 'b',
          text: "Likely yes for the portal components specifically: `createPortal`, `useId` for portal-target coordination, and `document` access are client-only, so any component that touches them needs a `'use client'` boundary (or to be wrapped by one) to run correctly in an RSC app — the library should not assume every consumer's server/client split already covers it.",
        },
        { id: 'c', text: 'No — RSC has no bearing on portals, since portals only affect DOM placement, not rendering environment.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Portals rely on `document`, which does not exist during server rendering, so any component using `createPortal` needs to run on the client. Libraries like Base UI and React Aria Components ship that `'use client'` boundary internally so consumers do not have to work it out themselves. A blanket rule that every export needs the directive is stricter than necessary — plenty of purely presentational, server-safe pieces do not.",
    },
  ],
};
