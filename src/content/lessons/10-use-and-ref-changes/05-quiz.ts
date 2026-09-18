import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt: 'A component calls `use(fetchWidget(id))` directly in its render body, with no cache. What actually happens?',
      choices: [
        { id: 'a', text: 'It suspends once, then renders normally once the promise resolves, same as any other `use()` call.' },
        { id: 'b', text: 'It suspends every time it renders, because each render creates a brand-new pending promise for `use()` to wait on.' },
        { id: 'c', text: 'React throws a compile-time error, because `use()` requires a memoized promise argument.' },
      ],
      correctChoiceId: 'b',
      explanation: '`use()` needs the *same* promise object across renders to ever get past the pending state. A fresh call to `fetchWidget(id)` on every render produces a fresh pending promise every time, so the component suspends indefinitely instead of settling. Cache the promise (module-level cache, or create it once and pass it down) so the same object is read each render.',
    },
    {
      id: 'q2',
      prompt: 'Where can `use()` legally be called?',
      choices: [
        { id: 'a', text: 'Only at the top level of a component, unconditionally, like other hooks.' },
        { id: 'b', text: 'Anywhere during a component or hook\'s render, including inside conditionals and loops, but not inside effects or event handlers.' },
        { id: 'c', text: 'Anywhere at all, including inside `try`/`catch` blocks, since it does not rely on throwing.' },
      ],
      correctChoiceId: 'b',
      explanation: '`use()` is exempt from the Rules of Hooks around unconditional top-level calls, so conditionals and loops are fine. It still has to run during render, so effects and event handlers are out. And it relies on throwing internally to integrate with Suspense and error boundaries, so `try`/`catch` around it breaks that mechanism.',
    },
    {
      id: 'q3',
      prompt: 'A rejected promise reaches a component\'s `use()` call. What is the idiomatic way to show a friendly error message instead of a blank screen?',
      choices: [
        { id: 'a', text: 'Wrap the `use()` call in `try`/`catch` and render the caught error inline.' },
        { id: 'b', text: 'Put an error boundary above the component (or above the Suspense boundary) to catch the re-thrown rejection.' },
        { id: 'c', text: 'Check `promise.status` before calling `use()` and skip the call if it is `"rejected"`.' },
      ],
      correctChoiceId: 'b',
      explanation: '`use()` cannot be wrapped in `try`/`catch`. A rejection propagates as a thrown error during render, so the tool for handling it is the same one you already use for any component that throws: an error boundary.',
    },
    {
      id: 'q4',
      prompt: 'A team is deciding whether to keep using `forwardRef` for a new component in a React 19.3 codebase. What is accurate?',
      choices: [
        { id: 'a', text: '`forwardRef` was removed in React 19; the component will not compile.' },
        { id: 'b', text: '`forwardRef` still works, but React\'s own docs say it is no longer necessary and will be deprecated in a future release — new code should accept `ref` as a plain prop instead.' },
        { id: 'c', text: '`forwardRef` is required whenever a component has more than one generic type parameter.' },
      ],
      correctChoiceId: 'b',
      explanation: 'React 19 makes `ref` an ordinary prop on function components. `forwardRef` keeps working for existing code and has no removal date yet, but it is called out in the docs as unnecessary going forward, and generic components in particular get simpler types without it.',
    },
    {
      id: 'q5',
      prompt: 'A ref callback is written inline: `<div ref={(node) => { const o = new ResizeObserver(cb); if (node) o.observe(node); }} />`. What happens on every re-render of the parent, independent of whether the div actually resized?',
      choices: [
        { id: 'a', text: 'Nothing extra; the callback only runs on mount and unmount, like an effect with an empty dependency array.' },
        { id: 'b', text: 'React sees a new function identity, so it tears down (or calls with `null`) and re-invokes the callback on every render, creating and discarding a `ResizeObserver` each time.' },
        { id: 'c', text: 'React throws a runtime error, because ref callbacks must be defined outside of JSX.' },
      ],
      correctChoiceId: 'b',
      explanation: 'Inline arrow functions are a new value every render. React treats a changed ref callback identity as a reason to detach and reattach, the same way a changed dependency array entry restarts an effect. Give the callback a stable identity (`useCallback`, or a function defined outside render) unless you actually want it to run every render.',
    },
    {
      id: 'q6',
      prompt: 'Which of these is a correct use of a ref, consistent with the "no reads or writes during render" rule the React Compiler enforces?',
      choices: [
        { id: 'a', text: '`const renderCount = useRef(0); renderCount.current++; return <p>{renderCount.current}</p>;`' },
        { id: 'b', text: '`const timeoutRef = useRef<number>(); useEffect(() => { timeoutRef.current = window.setTimeout(fn, 1000); return () => clearTimeout(timeoutRef.current); }, [fn]);`' },
        { id: 'c', text: '`const scrollRef = useRef<HTMLDivElement>(null); if (scrollRef.current) { scrollRef.current.scrollTop = 0; } return <div ref={scrollRef} />;` (this line runs during the component\'s render)' },
      ],
      correctChoiceId: 'b',
      explanation: 'Reading or writing `ref.current` has to happen outside of render — in an effect or an event handler — because render is expected to be a pure calculation of output from props and state. Option (a) mutates a ref during render to compute what to display, which the Compiler flags; option (c) reads and writes `scrollTop` during render for the same reason. Option (b) does the setup and teardown inside an effect, which is exactly where ref side effects belong.',
    },
  ],
};
