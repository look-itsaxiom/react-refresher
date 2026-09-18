import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A modal has a visible "×" close button with no text, built as `<button>×</button>`. `getByRole(\'button\', { name: \'Close\' })` fails. What is the most direct fix, and why not just switch the test to `getByText(\'×\')`?',
      choices: [
        {
          id: 'a',
          text: 'Add `aria-label="Close"` to the button; switching the test to `getByText` would pass, but it would hide the real problem — a screen reader announces "×" or nothing useful, not "Close".',
        },
        { id: 'b', text: 'Switch to `getByTestId(\'close-button\')`, since visual-only buttons can never have a real accessible name.' },
        { id: 'c', text: 'Leave the button as-is; `getByRole` is the wrong query for icon-only buttons and `getByText` is the correct one.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'The query failure is correctly reporting an accessibility gap: an icon-only button has no accessible name unless one is supplied explicitly. `aria-label` fixes both the test and the real experience for a screen-reader user in one change — rewriting the test to match broken markup would make it pass while leaving the bug in place.',
    },
    {
      id: 'q2',
      prompt: 'When should a test use `queryByRole` instead of `getByRole` for the same element?',
      choices: [
        {
          id: 'a',
          text: 'Never — `queryByRole` is a legacy alias kept only for backward compatibility with older Testing Library versions.',
        },
        {
          id: 'b',
          text: 'When asserting the element is absent: `getByRole` throws on zero matches before you can assert anything, so proving something is *not* there requires `queryByRole` (which returns null) or `findBy*`/`waitForElementToBeRemoved` for something that disappears asynchronously.',
        },
        { id: 'c', text: 'Whenever performance matters, since `queryByRole` skips the accessibility tree computation that `getByRole` performs.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`getBy*` and `queryBy*` differ only in what happens on zero matches — throw versus `null` — which makes `queryBy*` the only one of the two that can express a negative assertion at all.',
    },
    {
      id: 'q3',
      prompt:
        'A test clicks a button with `fireEvent.click(button)` and it passes, but the same click done by hand in the browser doesn\'t submit the form. What\'s the most likely explanation, and what should the test do differently?',
      choices: [
        {
          id: 'a',
          text: 'The component listens for `mousedown`/`pointerdown` rather than (or in addition to) `click`, or the button is briefly covered/disabled during the real interaction — `fireEvent` fires one named event and skips the realistic event sequence and DOM-state checks that `user-event` performs, so it can pass in cases a real click wouldn\'t.',
        },
        { id: 'b', text: '`fireEvent` and real clicks are functionally identical, so the discrepancy must be an unrelated bug in the component.' },
        { id: 'c', text: 'jsdom does not support `fireEvent.click` on `<button>` elements at all, so the test result is meaningless.' },
      ],
      correctChoiceId: 'a',
      explanation:
        '`fireEvent` dispatches a single synthetic event with no surrounding realism. `user-event` simulates the full pointer/keyboard sequence and browser-level guards (disabled elements, `pointer-events: none`, `maxLength`), which is exactly the gap that lets a `fireEvent` test diverge from real usage.',
    },
    {
      id: 'q4',
      prompt: 'A test does `await waitFor(() => { fireEvent.click(retryButton); expect(screen.getByText(\'Loaded\')).toBeInTheDocument(); })`. What\'s wrong with this, independent of whether it currently passes?',
      choices: [
        {
          id: 'a',
          text: 'Nothing — `waitFor` is designed to hold both an action and an assertion together so they retry as a unit.',
        },
        {
          id: 'b',
          text: 'The callback can run repeatedly until it stops throwing or times out, so a side effect inside it (the click) can fire multiple times — the click belongs outside `waitFor`, with only the assertion (ideally exactly one) inside, or as `findByText` after an awaited click.',
        },
        { id: 'c', text: 'The only problem is style; `waitFor` never actually re-invokes its callback more than once in practice.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`waitFor`\'s callback is a polling function, not a one-shot block — it re-runs on an interval until it succeeds or times out. A mutation placed inside it can happen several times, which is rarely what the test intends and can produce a false pass or a confusing failure.',
    },
    {
      id: 'q5',
      prompt:
        'A component calls `use()` on a promise inside a child wrapped in `<Suspense>`. After `render(<Parent/>)`, `screen.getByText(...)` for the resolved content sometimes fails in jsdom even though the same code works fine in the browser. What\'s the fix?',
      choices: [
        {
          id: 'a',
          text: 'Wrap the render itself in `await act(async () => { render(<Parent/>); })` so the microtasks React schedules for the suspending render and its resolution are flushed before assertions run, then query as usual.',
        },
        { id: 'b', text: 'Remove `<Suspense>` from the test build, since Suspense is not supported by Testing Library.' },
        { id: 'c', text: 'Add a fixed `sleep(1000)` before every query that follows a suspending render.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'A suspending render needs its resolution flushed, and `act`\'s job is exactly that. An arbitrary `sleep` is a race with production timing that will eventually flake; wrapping the render (or the interaction that triggers the suspense) in `act` waits for the actual work instead of guessing at a duration.',
    },
    {
      id: 'q6',
      prompt: 'Why does `getByRole` exclude an element with `aria-hidden="true"` by default, and when is passing `{ hidden: true }` the right call?',
      choices: [
        {
          id: 'a',
          text: '`aria-hidden="true"` removes the element from the accessibility tree, so a screen-reader user can\'t reach it either — the default matches what\'s actually perceivable. `{ hidden: true }` is for the rare case you\'re deliberately testing markup that\'s hidden from assistive tech (e.g. a duplicate live region, or content hidden until JS-driven reveal you\'re asserting about directly).',
        },
        { id: 'b', text: '`aria-hidden` is purely decorative and has no effect on queries; the exclusion is a bug some teams work around with `{ hidden: true }` on every call.' },
        { id: 'c', text: 'The exclusion only applies in Chrome-based browsers, so `{ hidden: true }` is required in any cross-browser suite.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'The default mirrors the accessibility tree a screen reader sees, which is the whole point of role-based querying. Overriding it with `{ hidden: true }` should be an explicit, rare choice for tests that are specifically about hidden content, not a routine flag.',
    },
  ],
};
