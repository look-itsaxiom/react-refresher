import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A card component visually places its "Delete" icon button above its title using `flex-direction: column-reverse`, but the title element still comes first in the JSX/DOM. A reviewer flags the Tab order as wrong. What is the accurate fix?',
      choices: [
        {
          id: 'a',
          text: 'Nothing — the browser\'s tab order follows visual position, so it already matches what\'s on screen.',
        },
        {
          id: 'b',
          text: 'Reorder the markup so the delete button comes before the title in the DOM, matching what CSS displays visually, rather than leaving DOM order and visual order to diverge.',
        },
        { id: 'c', text: 'Add `tabindex="1"` to the delete button so it\'s always visited first regardless of DOM position.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Tab order follows DOM order, never visual/CSS order — `flex-direction`, `order`, and similar properties are invisible to it. The fix is to make DOM order match what\'s displayed, not to reach for a positive `tabindex`, which creates a second, hand-maintained order that drifts out of sync the next time anyone touches the markup.',
    },
    {
      id: 'q2',
      prompt:
        'A developer removes the default focus outline with `button:focus { outline: none; }` because it clashed with the design, and adds no replacement. Which WCAG requirement does this fail, and what is the fix that keeps the design intent?',
      choices: [
        {
          id: 'a',
          text: 'It fails 2.4.7 Focus Visible; style `:focus-visible` instead of `:focus` with a custom indicator, rather than removing the indicator with no replacement.',
        },
        { id: 'b', text: 'It fails nothing, because 2.4.7 only requires a visible indicator on links, not buttons.' },
        { id: 'c', text: 'It fails 2.1.2 No Keyboard Trap, and the fix is to add a `tabindex` to the button.' },
      ],
      correctChoiceId: 'a',
      explanation:
        '2.4.7 requires *some* visible focus indicator on every focusable element, regardless of type. `outline: none` with no replacement removes it entirely for keyboard users. `:focus-visible` lets you design your own indicator that shows for keyboard focus (and other non-obvious cases) without reintroducing the default ring on every mouse click.',
    },
    {
      id: 'q3',
      prompt:
        'A team is building a custom listbox that must render 50,000 virtualized rows, where only a handful of rows exist as real DOM nodes at any moment. Which focus-management technique from the APG fits this constraint better, and why?',
      choices: [
        {
          id: 'a',
          text: 'Roving `tabindex`, because it always moves real DOM focus and is therefore more reliable for screen readers no matter the list size.',
        },
        {
          id: 'b',
          text: '`aria-activedescendant`, because the container keeps real DOM focus the whole time and the "active" row is just an id reference, so rows can mount and unmount under virtualization without ever needing to receive real focus themselves.',
        },
        { id: 'c', text: 'Positive `tabindex` values assigned in render order, recalculated every time the virtualized window scrolls.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Roving `tabindex` is the right default for small, stable widgets (the toolbar exercise in this lesson), but it requires the "active" item to be a real, currently-mounted DOM node you can call `.focus()` on. A virtualized list constantly mounts/unmounts rows, so `aria-activedescendant` — where the container holds real focus and just points an id at whichever row is logically active — avoids needing every possible row to exist as a focusable DOM node.',
    },
    {
      id: 'q4',
      prompt:
        'A modal built with `<dialog>` and `showModal()` is compared to a hand-built modal made from a styled `<div>` with `position: fixed`. What does the `<dialog>` version get for free that the `<div>` version has to reimplement by hand?',
      choices: [
        {
          id: 'a',
          text: 'Only the visual backdrop dimming — everything else still has to be written by hand either way.',
        },
        {
          id: 'b',
          text: 'A native focus trap that keeps Tab/Shift+Tab inside the dialog, the rest of the document becoming inert automatically while it\'s modal, `Escape` closing it, and focus being restored to whatever was focused before `showModal()` ran.',
        },
        { id: 'c', text: 'Automatic `aria-live` announcements of the dialog\'s content whenever it changes.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`showModal()` bundles the native trap, automatic inertness of the rest of the document, `Escape`-to-close, and focus restoration to the previously-focused element. A `position: fixed` div gets none of that automatically — which is exactly why the drawer exercise in this lesson, built on a plain `<div>`, has to hand-implement all four.',
    },
    {
      id: 'q5',
      prompt:
        'A single-page app swaps the main content on route change via client-side routing, with no full page load. A screen reader user reports that after navigating, they have no idea the page changed and their next Tab press lands somewhere confusing. What is the underlying cause?',
      choices: [
        {
          id: 'a',
          text: 'A traditional full page navigation resets focus to the top of the document and updates the tab title automatically; a client-side route change does neither unless the app does it deliberately, so without that code focus is simply left wherever it was.',
        },
        { id: 'b', text: 'Screen readers cannot detect any DOM changes that happen without a full page reload, by design.' },
        { id: 'c', text: 'This is unfixable without switching away from client-side routing entirely.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'Full page loads reset focus and update the tab title for free; a client-side route change is just a DOM update; and does neither unless the app moves focus (typically to the new page\'s heading or a route-announcer region) and updates `document.title` itself. It is very fixable — it just requires code that a full page load would have made automatic.',
    },
    {
      id: 'q6',
      prompt:
        'A developer writes `setRows(rows => [...rows, newRow()]); inputRefs.current[rows.length]?.focus();` in a click handler, intending to focus the newly-added row\'s input immediately. It intermittently focuses nothing. What is the most likely fix?',
      choices: [
        {
          id: 'a',
          text: 'Wrap the `setRows` call in `flushSync` from `react-dom` so the new row\'s DOM node is committed synchronously before the `.focus()` call runs.',
        },
        { id: 'b', text: 'Replace `useState` with a plain mutable variable so the update is synchronous.' },
        { id: 'c', text: 'Call `.focus()` inside a `useEffect` with an empty dependency array.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'React batches the `setRows` update, so the new row\'s DOM node may not exist yet when the very next line runs — the ref lookup can return `null` or a stale array length. `flushSync` forces that specific update to commit synchronously first, so the ref is attached by the time `.focus()` runs. (An empty-dependency `useEffect` only runs once, on mount, so it would not refire for later additions.)',
    },
  ],
};
