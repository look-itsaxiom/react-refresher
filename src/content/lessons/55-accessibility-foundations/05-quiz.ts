import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A design system spec says a decorative divider icon should visually disappear from screen readers but stay fully visible and animated on screen. Which mechanism is correct?',
      choices: [
        { id: 'a', text: 'Set `opacity: 0` on the icon.' },
        { id: 'b', text: 'Add the `hidden` attribute to the icon.' },
        { id: 'c', text: 'Add `aria-hidden="true"` to the icon.' },
      ],
      correctChoiceId: 'c',
      explanation:
        '`aria-hidden="true"` removes an element from the accessibility tree while leaving it fully rendered and visible — exactly "invisible to assistive tech, visible on screen." `hidden` (or `display: none`) removes it from layout too, so it would stop rendering. `opacity: 0` does neither — the element stays in the accessibility tree and a screen reader still announces it, which is the opposite of what a decorative icon needs.',
    },
    {
      id: 'q2',
      prompt:
        'A team ships a settings page that jumps from `<h1>Settings</h1>` straight to three `<h3>` section headings, with no `<h2>` anywhere. A stakeholder says "it still looks right visually, so this is fine." What is the actual harm, independent of visual appearance?',
      choices: [
        {
          id: 'a',
          text: 'None — heading levels only matter for CSS specificity, and this page has no heading-based styling.',
        },
        {
          id: 'b',
          text: 'Screen reader users jump between headings using a generated list (NVDA\'s Elements List, VoiceOver\'s Rotor); a skipped level makes that list misleading about the page\'s actual structure and can make a heading seem like it belongs to the wrong section.',
        },
        { id: 'c', text: 'It only matters for SEO, not for any real user.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Heading levels build the outline that screen readers expose as a navigable list. Skipping a level breaks that outline\'s meaning even though sighted users, who scan by font size and position rather than by heading level number, never notice.',
    },
    {
      id: 'q3',
      prompt:
        'A checkout form only accepts a typed password with no autofill, no passkey option, and no "show password" toggle, and a stakeholder asks whether this is a WCAG 2.2 problem. What is the accurate answer?',
      choices: [
        {
          id: 'a',
          text: 'Yes — WCAG 2.2\'s Accessible Authentication criterion requires that a login not rely purely on a cognitive test like remembering a password, without also allowing something that doesn\'t demand memory or puzzle-solving (such as permitting password-manager autofill or offering a passkey/magic-link alternative).',
        },
        { id: 'b', text: 'No — password fields are explicitly exempted from every WCAG 2.2 criterion.' },
        { id: 'c', text: 'No — Accessible Authentication only applies to CAPTCHAs, not passwords.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'Accessible Authentication, new in WCAG 2.2, targets exactly this: a cognitive-function test (recalling a password, solving a puzzle) can\'t be the *only* path through authentication. Blocking password-manager autofill (a common anti-pattern) or refusing to offer any memory-free alternative fails it; the fix isn\'t to remove passwords, it\'s to stop being the only option and stop blocking assistance.',
    },
    {
      id: 'q4',
      prompt:
        'The WebAIM Million 2025 scan found detectable WCAG 2 A/AA failures on 94.8% of the top one million home pages, with six error categories — led by low contrast and missing alt text — accounting for 96% of all errors found. What is the right conclusion to draw from that concentration?',
      choices: [
        {
          id: 'a',
          text: 'Accessibility bugs are so varied and unpredictable that no general strategy helps; every site needs a fully bespoke audit before any fix is attempted.',
        },
        {
          id: 'b',
          text: 'A small, well-known set of cheap fixes (contrast, alt text, and similarly common categories) would eliminate most of the web\'s detectable accessibility failures, which is why those are the first things to check and the first things this track drills.',
        },
        { id: 'c', text: 'Automated scanners like the one WebAIM used can detect the vast majority of real accessibility problems, so passing an automated scan is sufficient.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The concentration in a handful of categories means most of the web\'s accessibility debt is boring and fixable, not exotic. It does not mean automated scanning is sufficient on its own — automated tools catch missing alt text and contrast ratios reliably, but can\'t verify whether alt text is *accurate*, whether a custom widget is keyboard-operable, or whether reading order makes sense, which is why manual and assistive-technology testing (lesson 60) still matters.',
    },
    {
      id: 'q5',
      prompt:
        'A button\'s visible text reads "Add to cart," but a developer gave it `aria-label="Add item 48213 to shopping cart, quantity one"` for what they thought was extra clarity for screen reader users. A user testing with Voice Control says "click add to cart" and nothing happens. Why?',
      choices: [
        {
          id: 'a',
          text: 'Voice Control is broken and should be reported as a browser bug.',
        },
        {
          id: 'b',
          text: 'Voice Control matches spoken commands against an element\'s accessible name, not its visible text; since `aria-label` overrides the visible text in name computation, the accessible name is the long internal-sounding string the user never saw and wouldn\'t think to say.',
        },
        { id: 'c', text: '`aria-label` is ignored by all assistive technology except screen readers, so this should have no effect at all.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`aria-label` wins over visible text content in accessible name computation, and voice control tools rely on that computed name to match what a user says against what\'s on screen. Overriding a perfectly good visible label with a longer internal-sounding one breaks voice control silently. The fix here is to just leave the button\'s name as its visible text, or make the `aria-label` a match for what\'s displayed.',
    },
    {
      id: 'q6',
      prompt:
        'A modal dialog opens, and the developer wants the rest of the page to stay visually present behind a dimmed backdrop, but be completely unreachable by both keyboard focus and a screen reader\'s virtual cursor while the dialog is open. Which single attribute, applied to everything outside the dialog, does exactly that?',
      choices: [
        { id: 'a', text: '`aria-hidden="true"`' },
        { id: 'b', text: '`hidden`' },
        { id: 'c', text: '`inert`' },
      ],
      correctChoiceId: 'c',
      explanation:
        '`inert` removes a subtree from the accessibility tree *and* makes it unfocusable and unclickable, while still rendering it — exactly "visually present, behind a backdrop, but totally unreachable." `aria-hidden` alone removes it from the accessibility tree but does not stop keyboard focus from tabbing into it. `hidden` would also remove it from layout entirely, which contradicts "stay visually present."',
    },
  ],
};
