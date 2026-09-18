import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A signup form has `<input type="email">` with a visible label but no `autocomplete` attribute. A teammate argues this is fine because the browser can still offer to save the value. What is the actual gap?',
      choices: [
        { id: 'a', text: 'Nothing — `type="email"` alone satisfies 1.3.5, Identify Input Purpose.' },
        {
          id: 'b',
          text: 'Without a standard `autocomplete` token, the field\'s *purpose* is not exposed in a machine-readable way, which is what 1.3.5 actually requires — browser-remembered values and AT-driven purpose detection are separate mechanisms.',
        },
        { id: 'c', text: 'The gap only matters for password fields, not email.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '1.3.5 is about exposing purpose programmatically via the `autocomplete` token vocabulary, not about whether the browser happens to remember the value some other way. Assistive tech and browser extensions key off the token itself.',
    },
    {
      id: 'q2',
      prompt:
        'A form uses `aria-required="true"` on every required input but skips the native `required` attribute entirely, and handles all blocking/validation in JavaScript. Is this a WCAG problem?',
      choices: [
        { id: 'a', text: 'Yes — `required` is mandatory for 3.3.2, so this always fails.' },
        {
          id: 'b',
          text: 'Not by itself. `aria-required` supplies the accessibility-tree semantic; `required` additionally triggers native browser validation UI. Skipping `required` is a legitimate choice when the app owns its own validation UI and error messaging consistently.',
        },
        { id: 'c', text: 'Yes, because without `required` the field can never be marked invalid.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`aria-required` and `required` do different jobs. Many production forms use `aria-required` for semantics and roll their own validation UI with `noValidate`, precisely so the shown message and the announced message are the same one.',
    },
    {
      id: 'q3',
      prompt:
        'A dashboard marks failed jobs with only a red-filled circle in a list of otherwise-gray circles. What is the minimum fix required by 1.4.1, Use of Color?',
      choices: [
        { id: 'a', text: 'Make the red more saturated so it stands out further.' },
        { id: 'b', text: 'Add a second, non-color channel — visible text or an icon shape — so the status is identifiable without perceiving that specific color.' },
        { id: 'c', text: 'Add a tooltip that appears on hover, showing the status word.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A hover-only tooltip fails for touch and keyboard users and isn\'t discoverable by default. The fix has to be visible and always present: text or a distinct shape/pattern alongside the color, not a stronger version of the same single channel.',
    },
    {
      id: 'q4',
      prompt:
        'A card\'s selected state is currently shown only with `box-shadow: 0 0 0 3px blue`. Testing in Windows forced colors mode, the shadow is gone entirely and the card looks unselected. What\'s the correct fix?',
      choices: [
        { id: 'a', text: 'Increase the shadow\'s blur radius so it renders more strongly.' },
        { id: 'b', text: 'Switch to a `border` or `outline` for the selected indicator — forced colors mode strips most `box-shadow`s but preserves borders and outlines, remapped to system colors.' },
        { id: 'c', text: 'Nothing can be done; forced colors mode is expected to lose some visual detail.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Forced colors mode treats `box-shadow` as decorative and removes it, but keeps `border`/`outline` because they\'re treated as structural. This is exactly why focus rings and selection indicators should be built from outline/border, not shadow alone.',
    },
    {
      id: 'q5',
      prompt:
        'A page has a hero banner that slides in from the left over 600ms on load. A user has `prefers-reduced-motion: reduce` set. What does the spec\'s intent actually call for?',
      choices: [
        { id: 'a', text: 'Remove the banner\'s entrance treatment entirely — no fade, no transition, just appear.' },
        { id: 'b', text: 'Reduce the motion — for example, replace the sliding translation with a short opacity fade or no transition — rather than assuming "reduce" means "delete all visual change."' },
        { id: 'c', text: 'Ignore the preference for a one-time entrance animation since it only plays once.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The query name is literal: reduce non-essential motion, particularly large translations/parallax that can trigger vestibular symptoms. A same-duration state change with no spatial movement (e.g. a fade) is a reasonable "reduced" version; it doesn\'t have to become nothing.',
    },
    {
      id: 'q6',
      prompt:
        'A checkout flow has an auto-advancing 3-slide promo carousel above the form that rotates every 4 seconds with no visible controls, and a signup step that requires solving a distorted-text CAPTCHA with no alternative. Which WCAG issues are actually present?',
      choices: [
        {
          id: 'a',
          text: 'Only the CAPTCHA is a problem; a 4-second auto-rotation is short enough to be exempt from 2.2.2.',
        },
        {
          id: 'b',
          text: 'Both are real: the CAPTCHA with no alternative modality risks failing 3.3.8, Accessible Authentication; the carousel is likely fine on its own timing, but if it auto-updates for more than five seconds total (across users who don\'t interact) it still needs a pause/stop/hide control under 2.2.2.',
        },
        {
          id: 'c',
          text: 'Neither is required to be fixed since both are common, industry-standard patterns.',
        },
      ],
      correctChoiceId: 'b',
      explanation:
        '2.2.2 doesn\'t exempt short-interval rotation just because each individual slide is brief — the requirement is about content that moves/auto-updates for more than five seconds in total, which a continuously auto-advancing carousel does. 3.3.8 doesn\'t ban CAPTCHAs outright, but requires an alternative that isn\'t a cognitive function test, like an email or SMS-based check.',
    },
  ],
};
