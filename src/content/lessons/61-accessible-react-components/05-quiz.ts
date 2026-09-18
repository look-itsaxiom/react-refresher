import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A team is deciding whether to hand-roll a date-range picker or adopt a headless library for it. Which reasoning best matches this lesson\'s "buy the hard parts" argument?',
      choices: [
        {
          id: 'a',
          text: 'Hand-roll it — every headless library adds bundle size, and bundle size always outweighs correctness risk.',
        },
        {
          id: 'b',
          text: 'A date-range picker has a large keyboard/focus/screen-reader surface (two calendars, range selection, cross-browser SR quirks) that a maintained library has already tested; adopt one and spend the saved time on labels, contrast, and content, which no library provides.',
        },
        {
          id: 'c',
          text: 'It doesn\'t matter which; any component library, styled or unstyled, gives the same accessibility guarantees as long as it uses semantic HTML somewhere internally.',
        },
      ],
      correctChoiceId: 'b',
      explanation:
        'The "buy vs. build" line in this lesson is drawn at surface size: a disclosure or switch (lesson 57) is small enough to own; a date picker, combobox, tree, or grid has enough keyboard/focus/screen-reader edge cases that a team re-derives the same bugs a maintained library already fixed. Buying doesn\'t remove your responsibility for labels, contrast, or content — it removes the part that\'s expensive to test yourself.',
    },
    {
      id: 'q2',
      prompt:
        'Why does the APG combobox pattern use `aria-activedescendant` to track the "active" option instead of moving real DOM focus onto each option as the user arrows through the list — the roving-`tabindex` approach from lesson 58\'s toolbar?',
      choices: [
        {
          id: 'a',
          text: 'Because options in a combobox are typically transient (they don\'t exist until you type) and the user needs to keep typing in the input the whole time; keeping real focus on the input while a virtual reference tracks the active option supports both at once.',
        },
        { id: 'b', text: 'Because `aria-activedescendant` is newer and roving tabindex is deprecated in ARIA 1.3.' },
        {
          id: 'c',
          text: 'There is no real difference — both approaches are interchangeable for any widget, and the choice is purely stylistic.',
        },
      ],
      correctChoiceId: 'a',
      explanation:
        'Roving `tabindex` fits static, always-mounted widgets like the toolbar, where moving real focus between buttons is harmless. A combobox\'s options are transient and the input needs to keep real focus so the user can keep typing — moving focus onto an option would break that. `aria-activedescendant` lets the input hold real focus while a reference tracks which option is logically active.',
    },
    {
      id: 'q3',
      prompt:
        'A combobox implementation sets `aria-autocomplete="both"` on its input. What does that value promise, beyond what `aria-autocomplete="list"` promises?',
      choices: [
        {
          id: 'a',
          text: 'Nothing different — `list` and `both` are aliases in the ARIA spec.',
        },
        {
          id: 'b',
          text: 'That, in addition to showing a filtered popup list, the widget also inline-completes the input\'s own text (e.g. suggesting the rest of a word as you type, often as selected/highlighted text you can accept or keep typing over).',
        },
        { id: 'c', text: 'That the popup list is virtualized for performance.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`aria-autocomplete` has three values: `none` (no completion suggestions), `list` (a popup list you filter, which is what the exercise in this lesson builds), and `both` (a popup list *plus* inline text completion within the input itself). Picking the wrong value tells assistive tech to expect behavior the widget doesn\'t actually provide.',
    },
    {
      id: 'q4',
      prompt:
        'A combobox filters a 5,000-row option list on every keystroke, and users on lower-end devices report the input feels laggy while typing quickly. Which fix addresses this without abandoning the APG combobox pattern?',
      choices: [
        {
          id: 'a',
          text: 'Wrap the filtering computation\'s input value in `useDeferredValue` (or the state update in `startTransition`), so the input stays responsive to keystrokes while the filtered list computation catches up.',
        },
        {
          id: 'b',
          text: 'Switch `aria-activedescendant` to roving `tabindex` — moving real focus is faster than updating an attribute.',
        },
        { id: 'c', text: 'Debounce the input\'s `onChange` itself, so keystrokes are dropped until the user pauses.' },
      ],
      correctChoiceId: 'a',
      explanation:
        '`useDeferredValue`/`startTransition` let the input\'s own value update immediately (so typing never feels dropped) while marking the derived filtered-list render as lower priority, letting React interrupt it if more keystrokes arrive. Debouncing `onChange` itself would make the input drop or delay reflecting what was typed, which is a worse user experience than a slightly-lagging list. Switching focus models doesn\'t address a filtering performance problem at all.',
    },
    {
      id: 'q5',
      prompt:
        'A combobox\'s result-count announcement (`role="status"`, "N results") updates synchronously on every keystroke, with no debounce. A screen reader user who types a five-letter query quickly reports hearing a confusing, overlapping stream of announcements. What\'s the fix?',
      choices: [
        {
          id: 'a',
          text: 'Remove the `role="status"` region entirely — announcing result counts isn\'t required by the APG pattern.',
        },
        {
          id: 'b',
          text: 'Debounce the status text update (a short timeout, or `useDeferredValue` around the count) so it only announces once typing pauses, instead of queuing a new announcement on every keystroke.',
        },
        { id: 'c', text: 'Switch the region from `role="status"` to `role="alert"` so announcements interrupt instead of queue.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`role="status"` (implicit `aria-live="polite"`) queues announcements rather than dropping them, so five rapid keystrokes can produce five queued announcements the screen reader is still working through well after the user stopped typing. Debouncing the text update — not the input\'s own value — keeps the input responsive while collapsing those five updates into one. Switching to `role="alert"` would make the interruption problem worse, not better, since alerts cut in immediately.',
    },
    {
      id: 'q6',
      prompt:
        'A designer wants a custom `<select>`-like dropdown where each option shows an avatar and two lines of text, something a plain native `<select>` can\'t render inside its `<option>`s. Which 2026 option keeps the most native behavior for free, if the team can accept uneven browser support in the near term?',
      choices: [
        {
          id: 'a',
          text: 'The customizable `<select>` (`appearance: base-select` plus `<selectedcontent>`), which allows arbitrary markup inside `<option>` while keeping the browser\'s native keyboard handling, focus management, and screen reader behavior — support should be checked against the current caniuse/MDN status before relying on it broadly.',
        },
        { id: 'b', text: 'A `<datalist>` bound to a text input, since `<datalist>` already supports rich per-option markup.' },
        {
          id: 'c',
          text: 'There is no way to get native `<select>` behavior with custom option content; a headless combobox library is the only option, full stop.',
        },
      ],
      correctChoiceId: 'a',
      explanation:
        'The customizable `<select>` feature is built for exactly this: rich `<option>` content while keeping native semantics. `<datalist>` is useful for lightweight text suggestions but does not support rich per-option markup like avatars. A headless library is a reasonable fallback wherever customizable `<select>` support isn\'t sufficient yet, but it\'s not the only option as browser support for the native feature lands.',
    },
  ],
};
