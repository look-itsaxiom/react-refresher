import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A component renders a server-computed `id="row-42"` on one render and a client-computed `id="row-17"` on the next, with no other differences. What actually happens during hydration, and does `onRecoverableError` fire?',
      choices: [
        {
          id: 'a',
          text: 'React patches the id attribute to the client value and calls onRecoverableError once to report the mismatch.',
        },
        {
          id: 'b',
          text: 'React discards that DOM node and regenerates it on the client, calling onRecoverableError.',
        },
        {
          id: 'c',
          text: "React logs a console warning, leaves the server's id attribute on the page unchanged, and does not call onRecoverableError.",
        },
      ],
      correctChoiceId: 'c',
      explanation:
        "Attribute mismatches are not treated like text-content mismatches: React warns but does not patch them and does not discard the node, so the server's stale value silently sticks around with no error surfaced to onRecoverableError. That's exactly why a Math.random()-based id is more dangerous than it looks — nothing in your error reporting will ever tell you it happened.",
    },
    {
      id: 'q2',
      prompt:
        'A component renders server-computed text "12 items" and client-computed text "15 items" in the same `<span>`, with everything else matching. What does the user actually see right after hydration, and why?',
      choices: [
        {
          id: 'a',
          text: '"12 items", because React trusts the server-rendered DOM and ignores the client value whenever the two disagree.',
        },
        {
          id: 'b',
          text: '"15 items", because a text mismatch causes React to discard that subtree\'s server-rendered DOM and re-render it fresh with the client value.',
        },
        {
          id: 'c',
          text: 'Neither — React throws and the whole page fails to hydrate.',
        },
      ],
      correctChoiceId: 'b',
      explanation:
        'Unlike attribute mismatches, a mismatched text node is not left alone: React regenerates that part of the tree on the client and calls onRecoverableError once for the boundary, since it has a real error object (with a diff) to report.',
    },
    {
      id: 'q3',
      prompt:
        'You wrap a `<span>{new Date().toLocaleTimeString()}</span>` in `suppressHydrationWarning`. A month later someone adds a sibling `<span>{Math.random()}</span>` next to it inside the same parent and wonders why they still see a hydration warning in the console. What\'s the right explanation?',
      choices: [
        {
          id: 'a',
          text: 'suppressHydrationWarning only applies to the exact element it\'s placed on, one level deep — it does nothing for a sibling with its own unrelated mismatch.',
        },
        {
          id: 'b',
          text: "suppressHydrationWarning is broken in React 19 and no longer suppresses anything.",
        },
        {
          id: 'c',
          text: 'suppressHydrationWarning suppresses all warnings for the rest of that render, so this must be an unrelated bug.',
        },
      ],
      correctChoiceId: 'a',
      explanation:
        "suppressHydrationWarning is a scalpel, not a tree-wide switch: it silences the warning for that one element's own text/attributes and nothing else, which is exactly why it's safe to use for one known-unavoidable value without hiding other real bugs nearby.",
    },
    {
      id: 'q4',
      prompt:
        'A component needs to render differently based on `window.matchMedia(\'(max-width: 600px)\').matches`. Reading it directly during render works in the browser but throws during `renderToString`. What is the actual fix, not just a workaround?',
      choices: [
        {
          id: 'a',
          text: 'Wrap the read in `typeof window !== "undefined"` and fall back to a guess on the server — this avoids the crash and is the complete fix.',
        },
        {
          id: 'b',
          text: 'Use useSyncExternalStore with a getServerSnapshot that returns a fixed assumption, so the value used for the server render and the client\'s first (hydrating) render always agree, then let the hook correct to the real value afterward.',
        },
        {
          id: 'c',
          text: 'Call the media query check inside useMemo so it only runs once per component instance.',
        },
      ],
      correctChoiceId: 'b',
      explanation:
        'The typeof-window guard only stops the crash; the server\'s guess and the client\'s real value can still disagree, which is a hydration mismatch, not a fix. getServerSnapshot is specifically for this: it supplies one agreed-on value for the render that has to match, and the hook\'s own machinery handles correcting to the live client value afterward.',
    },
    {
      id: 'q5',
      prompt:
        'A page has three `<Suspense>` boundaries below the fold. The JavaScript for the second one is still loading when the user clicks a button inside the third boundary, which has already hydrated. What happens to that click?',
      choices: [
        {
          id: 'a',
          text: "It's dropped, because React can't process any interaction until every Suspense boundary on the page has hydrated.",
        },
        {
          id: 'b',
          text: "It's handled immediately — the third boundary already hydrated independently of the second, since selective hydration treats each boundary as its own unit and doesn't wait for slower siblings.",
        },
        {
          id: 'c',
          text: "It's queued and replayed only after the second boundary finishes hydrating, since boundaries hydrate strictly in document order.",
        },
      ],
      correctChoiceId: 'b',
      explanation:
        "Selective hydration doesn't hydrate top-to-bottom in lockstep. Each Suspense boundary hydrates independently as its JS becomes available, and a boundary that's already hydrated handles its own events normally — a slower sibling boundary doesn't block it. The replay-queued-events behavior is for events on a boundary that hasn't hydrated yet, not for ones that already have.",
    },
    {
      id: 'q6',
      prompt:
        "You're comparing three ways to cut hydration cost: Astro islands, Next.js Partial Prerendering, and Qwik's resumability. Which pair is actually solving the same problem, and which is doing something categorically different?",
      choices: [
        {
          id: 'a',
          text: 'Islands and PPR both decide which parts of a page need dynamic treatment (client JS or a dynamic hole) versus can stay fully static; resumability instead eliminates the hydration re-execution step itself, for whatever is interactive.',
        },
        {
          id: 'b',
          text: 'PPR and resumability are the same idea under different names; islands are unrelated, since they only apply to content sites with no interactivity at all.',
        },
        {
          id: 'c',
          text: 'All three are the same technique — marking parts of a page as static — implemented in three different frameworks.',
        },
      ],
      correctChoiceId: 'a',
      explanation:
        "Islands (ship no JS for non-interactive components) and PPR (serve a static shell with dynamic holes streamed in) are both about scoping which parts of a response are static versus dynamic — one on the client-JS axis, one on the server-rendering axis. Resumability is a different axis entirely: for content that is interactive, it skips re-running component logic on the client altogether by serializing enough state and listener wiring to resume instead of hydrate, which is also why it has no hydration mismatches to worry about.",
    },
  ],
};
