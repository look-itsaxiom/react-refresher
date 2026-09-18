import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A function component sets `MyComponent.defaultProps = { count: 0 }`. In a React 19.3 app, what happens when a caller omits `count`?',
      choices: [
        { id: 'a', text: '`count` is `0` — `defaultProps` still applies to function components.' },
        {
          id: 'b',
          text: '`count` is `undefined`, with no warning and no error — `defaultProps` on function components is removed and simply never read.',
        },
        { id: 'c', text: 'The build fails, because TypeScript now requires `count` to be passed explicitly.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`defaultProps` on function components is a removed, silent API in React 19: the field can still be set, but nothing reads it. There is no warning and no build error — the only symptom is a prop that is `undefined` where it used to have a fallback. This is the class of bug the "modernize the legacy component" exercise was built around: replace it with a default parameter in the function signature.',
    },
    {
      id: 'q2',
      prompt: 'A component renders `<input ref="username" />` in a React 19.3 app. What happens?',
      choices: [
        { id: 'a', text: 'It works exactly as it did in React 18 — string refs still populate `this.refs`.' },
        { id: 'b', text: 'It is silently ignored: the ref is never attached, but nothing else changes.' },
        { id: 'c', text: 'React throws "String refs are no longer supported" at render time.' },
      ],
      correctChoiceId: 'c',
      explanation:
        'Unlike `defaultProps`, string refs are a loud removal: React throws immediately when it encounters one, rather than quietly ignoring it. Replace it with a ref callback or `useRef`.',
    },
    {
      id: 'q3',
      prompt:
        'A class component defines `static contextTypes` and reads `this.context.theme`; an ancestor class defines `static childContextTypes` and `getChildContext()` to provide it. In React 19.3, what does `this.context.theme` evaluate to?',
      choices: [
        {
          id: 'a',
          text: '`undefined` (or whatever the code falls back to) — legacy context is removed, so `getChildContext` is never called and `this.context` never receives it, with no warning.',
        },
        { id: 'b', text: 'React throws a runtime error the first time `getChildContext` would have been called.' },
        { id: 'c', text: 'It still works — legacy context is deprecated but not removed until React 20.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'Legacy context is a silent removal, the same category as `defaultProps`: the class methods are still there, but nothing in React 19 ever calls `getChildContext` or reads `contextTypes`, so the value simply never arrives. This is exactly the bug in the "fix the broken context" exercise — both consumers fall back to a default because the wiring is dead code.',
    },
    {
      id: 'q4',
      prompt: 'A codebase upgraded straight from `react-dom` 18 calls `ReactDOM.render(<App />, container)`. What happens on React 19.3?',
      choices: [
        { id: 'a', text: 'It renders with a console warning recommending `createRoot`.' },
        { id: 'b', text: '`ReactDOM.render` throws, pointing you at `createRoot` — it is a loud, not silent, removal.' },
        { id: 'c', text: 'It silently does nothing; the app mounts a blank page.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`ReactDOM.render`, `hydrate`, `unmountComponentAtNode`, and `findDOMNode` are all loud removals — calling them throws rather than quietly no-oping. Replace with `createRoot(container).render(...)`, `hydrateRoot`, `root.unmount()`, and a DOM ref, respectively.',
    },
    {
      id: 'q5',
      prompt:
        'A team jumps directly from React 18.2 to 19.0 in one PR. After the bump, three features are subtly broken — a default prop value, a context value, and an old validation call — but the console was clean during the upgrade. What earlier step would have surfaced all three before the version bump?',
      choices: [
        { id: 'a', text: 'Running the existing test suite one additional time on React 18.2.' },
        {
          id: 'b',
          text: 'Upgrading to the intermediate React 18.3 release first, which backports console warnings for every 19 removal without changing any runtime behavior, then fixing every warning before bumping to 19.',
        },
        { id: 'c', text: 'Installing `@types/react@19` early, since TypeScript would flag all three at compile time.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'React 18.3 exists specifically as a bridge: same behavior as 18.2, but with warnings for `defaultProps`, `propTypes`, string refs, legacy context, `ReactDOM.render`, and the rest of the React 19 removals. It turns silent removals into loud warnings while you still have 18\'s behavior to fall back on, which is exactly the gap a straight 18.2-to-19.0 jump skips. TypeScript types don\'t catch legacy context or `defaultProps` misuse — both are structurally valid JavaScript that TypeScript has no reason to flag.',
    },
    {
      id: 'q6',
      prompt:
        'After upgrading `@types/react` to 19, a ref callback written as `ref={(node) => (instanceRef.current = node)}` starts producing a confusing type error it never had before. Why?',
      choices: [
        { id: 'a', text: 'It is purely a formatting issue; the codemod always renames this style of callback.' },
        {
          id: 'b',
          text: 'React 19 lets ref callbacks return a cleanup function, the same way an effect does, so the updated types now interpret this callback\'s implicit return value as an attempted cleanup function instead of as `void`.',
        },
        { id: 'c', text: 'Arrow functions with implicit returns are disallowed anywhere in React 19 codebases.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Ref cleanup functions are new in React 19: a ref callback can return a function that runs on detach, mirroring how effects work. The updated `@types/react` types reflect that by giving the return position meaning, so a callback that implicitly returns a non-`void` value (like the result of an assignment expression) now reads as "this is trying to be a cleanup function." Wrapping the body in braces — `ref={(node) => { instanceRef.current = node; }}` — makes the callback return `void` on purpose and removes the ambiguity.',
    },
  ],
};
