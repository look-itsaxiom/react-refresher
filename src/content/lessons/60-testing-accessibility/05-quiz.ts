import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A team runs `vitest-axe` in CI, gets a clean run with zero violations on a new custom combobox, and marks the accessibility ticket done. What is the most accurate thing to tell them before they close it?',
      choices: [
        {
          id: 'a',
          text: 'A clean axe run is sufficient — if the automated tool found nothing, there is nothing left to check.',
        },
        {
          id: 'b',
          text: 'A clean axe run means the combobox has no *structural* violations axe knows to look for (missing names, invalid ARIA, contrast). It says nothing about whether arrow keys move the selection, whether Escape closes it, or whether a screen reader announces the selected option — that needs the keyboard pass and a screen reader smoke test.',
        },
        { id: 'c', text: 'axe cannot test custom widgets at all, so this result is meaningless either way.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'axe operates on the accessibility tree and computed styles — presence and validity, not behavior. A combobox can have a perfectly valid `role="combobox"`, a valid accessible name, and correct ARIA attributes while still being completely unusable with a keyboard, which is exactly the kind of gap the manual layer exists to close.',
    },
    {
      id: 'q2',
      prompt:
        'Two PRs both touch a form. PR A\'s `getByLabelText(\'Email\')` query starts failing. PR B\'s axe run in CI flags a new `color-contrast` violation on a status badge. A reviewer says both are "just test noise" and asks to skip them. What is the accurate distinction between the two?',
      choices: [
        {
          id: 'a',
          text: 'Both are equally safe to skip — a failing test is a failing test, and neither reveals anything about real users.',
        },
        {
          id: 'b',
          text: 'PR A\'s failure means the email input lost its accessible label association — every user of that query, sighted or not, is really about to hit a missing-label bug. PR B\'s failure needs a look before dismissing, since `color-contrast` has known false positives (e.g. text over a gradient), but it should never be skipped by default just because it *might* be one.',
        },
        { id: 'c', text: 'Neither matters unless a screen reader user files a bug report first.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A `getByLabelText` failure is a real, direct signal — the query models exactly what a screen reader does to find that field, so its failure means the field is now unreachable by name. An axe rule *can* misfire on some cases (contrast against gradients or anti-aliased edges is a known one), which is why it is worth a quick investigation rather than an instant dismissal, but "known to have occasional false positives" is not the same permission as "ignore by default."',
    },
    {
      id: 'q3',
      prompt:
        'During a keyboard-only pass, a developer notices a custom dropdown\'s focus ring disappears when they click it with a mouse, but reappears when they Tab to the next control and back. Is this a bug?',
      choices: [
        {
          id: 'a',
          text: 'Yes — a focus ring should never disappear, on a mouse click or otherwise.',
        },
        {
          id: 'b',
          text: 'No — that is exactly what `:focus-visible` is supposed to do: suppress the ring for a pointer interaction (where the user doesn\'t need it, since they can see where they clicked) while keeping it for keyboard focus. The bug pattern to actually watch for is `outline: none` with no `:focus-visible` replacement, which removes the ring for keyboard users too.',
        },
        { id: 'c', text: 'It only matters if a screen reader is also running at the same time.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`:focus-visible` is the browser heuristic for exactly this: show a focus indicator when it is likely to be needed (keyboard, programmatic focus) and suppress it when it likely isn\'t (a mouse click). The failure mode worth flagging in a keyboard-only pass is a *keyboard* Tab press producing no visible indicator at all, not a mouse click producing none.',
    },
    {
      id: 'q4',
      prompt:
        'Testing a custom date picker with a screen reader, a developer can navigate the whole page fine using browse mode (arrow keys), including reading over the picker\'s static labels. The moment they Tab into the calendar grid itself and try to use arrow keys to move between days, nothing is announced. What does this pattern usually indicate?',
      choices: [
        {
          id: 'a',
          text: 'The screen reader is broken and needs to be reinstalled.',
        },
        {
          id: 'b',
          text: 'Browse mode walks the DOM and reads static content regardless of how well the widget is built, so it can look fine even when the widget itself is broken. The real test only happens in focus mode, once you\'ve tabbed into the widget and it has to handle arrow-key input and update ARIA state (like `aria-activedescendant` or `aria-selected`) itself — a gap here usually means the grid\'s roving-focus or ARIA-state wiring is incomplete.',
        },
        { id: 'c', text: 'This is expected and not fixable — calendar grids cannot be made screen-reader accessible.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'This is precisely why a smoke test script needs both modes: browse mode tests whether content is exposed in the tree at all; tabbing in and testing focus/interaction mode tests whether the widget itself correctly manages roving focus and communicates state changes as the user interacts, which is a different (and frequently unfinished) piece of work.',
    },
    {
      id: 'q5',
      prompt:
        'A designer swaps a component\'s "selected" tab styling from a border to a background-color fill only, and it ships. QA later files a bug: in Windows High Contrast Mode (forced-colors), no tab looks selected. What is the accurate root cause?',
      choices: [
        {
          id: 'a',
          text: 'Forced-colors mode is buggy and the fix is to tell affected users to disable it.',
        },
        {
          id: 'b',
          text: 'Forced-colors mode overrides custom background and text colors with a small system palette to guarantee contrast, so a state that is only conveyed by a background-color fill (with no border, icon, or text change) becomes invisible under it. Emulating `forced-colors` in DevTools during review would have caught this before it shipped.',
        },
        { id: 'c', text: 'This only affects icons, never background colors, so the bug report must be about something else.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Forced-colors mode strips most author-chosen colors to preserve user-controlled contrast, which reliably breaks any UI state conveyed purely through a background fill. This is exactly the kind of regression a five-second DevTools emulation check catches, and exactly the kind that a color-contrast-only axe rule would never flag, since the contrast ratio in normal rendering was fine.',
    },
    {
      id: 'q6',
      prompt:
        'A team wants to add `axe` as a hard CI gate on a five-year-old codebase that currently fails on 40 different components. What is the most defensible rollout plan?',
      choices: [
        {
          id: 'a',
          text: 'Fix all 40 components first, then turn the gate on — anything less is not a real commitment to accessibility.',
        },
        {
          id: 'b',
          text: 'Turn the gate on immediately with a rule-and-selector-keyed allowlist covering the 40 existing violations, so any *new* violation fails CI right away, and remove allowlist entries as each existing one gets fixed. Never let the allowlist grow.',
        },
        { id: 'c', text: 'Run axe only in a nightly job and email the results, since a hard gate on a legacy codebase is never practical.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Waiting to fix everything before gating anything means the codebase keeps accumulating *new* violations for however long that takes — often indefinitely. An allowlist scoped to specific known rule-and-selector pairs freezes today\'s debt as visible and tracked while making every new regression an immediate build failure, which is the realistic path to the gate actually holding.',
    },
  ],
};
