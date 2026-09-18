import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A developer adds `tabindex="0"` and a `keydown` handler for Enter to a `<div role="button">`, and asks whether that makes it equivalent to a real `<button>`. What is still missing?',
      choices: [
        { id: 'a', text: 'Nothing — Enter handling plus tabindex covers everything a button needs.' },
        {
          id: 'b',
          text: 'Space should also activate the control (native buttons respond to both Enter and Space), and the element still lacks the default focus outline, form submission behavior, and disabled-state handling a real <button> gets automatically.',
        },
        { id: 'c', text: 'ARIA roles cannot be applied to `<div>` elements at all, so this markup is invalid.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Rule 3 (all interactive ARIA must be keyboard operable) means matching *every* expected key, not just one — a real button responds to both Enter and Space. This is also the recurring argument for rule 1: a `<div role="button">` requires you to reimplement several behaviors by hand that a native `<button>` never asks for.',
    },
    {
      id: 'q2',
      prompt:
        'A settings panel has a "Notifications" toggle button that reveals a panel of options. A reviewer says the button needs `aria-controls` even though `aria-expanded` already tells a screen reader the panel is open. Are they right?',
      choices: [
        {
          id: 'a',
          text: 'No — aria-expanded is sufficient on its own; aria-controls is a legacy attribute with no modern support.',
        },
        {
          id: 'b',
          text: 'Yes — aria-expanded only reports open/closed state; aria-controls is the property that names *which* element the button reveals, letting AT navigate directly to it rather than just knowing "something changed."',
        },
        { id: 'c', text: 'Yes, but only because the panel is not itself a landmark region.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'aria-expanded (a state) and aria-controls (a property) do different jobs and are meant to be used together on a disclosure button: expanded says whether it\'s open, controls says what it opens. Dropping either leaves a real gap, not redundancy.',
    },
    {
      id: 'q3',
      prompt:
        'A component conditionally renders `{message && <div aria-live="polite">{message}</div>}` — the div only enters the DOM once there is a message. A teammate reports that screen readers never announce it, even though the text is correct once you inspect the DOM. What is the most likely cause?',
      choices: [
        {
          id: 'a',
          text: '`aria-live="polite"` is deprecated and no longer supported by any screen reader.',
        },
        {
          id: 'b',
          text: 'Most assistive tech expects a live region to already exist in the DOM and watches it for *mutations*; a node that is freshly created with its final text already set often is not detected as a change worth announcing.',
        },
        { id: 'c', text: 'The message text contains punctuation that screen readers cannot pronounce.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'This is the single most common live-region bug: the region needs to be pre-rendered (empty or with placeholder content) so that later text updates are true mutations AT can detect. `role="alert"` is the documented exception, since alert insertions are announced on mount.',
    },
    {
      id: 'q4',
      prompt:
        'A product card\'s "Add to wishlist" control is a heart-shaped icon `<button>` with `aria-label="Add to wishlist"` and no visible text. Voice Control and Dictation users report they can activate it fine by saying "click add to wishlist," but a review flags it anyway, pointing out the button also has `aria-pressed` that never changes. What is the actual defect?',
      choices: [
        {
          id: 'a',
          text: 'aria-pressed should never be combined with aria-label — the combination is invalid ARIA.',
        },
        {
          id: 'b',
          text: 'aria-pressed is a state, not a static property; leaving it fixed misrepresents whether the item is currently wishlisted, which is exactly the kind of thing a toggle button exists to report.',
        },
        { id: 'c', text: 'Icon-only buttons can never have a valid accessible name, regardless of aria-label.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The name (via aria-label) is fine — an icon-only button with a real accessible name passes rule 5. The bug is treating a state attribute like a property: aria-pressed needs to flip with the actual wishlist status, or a screen reader user gets told the same "not pressed" every time regardless of the real state.',
    },
    {
      id: 'q5',
      prompt:
        'A confirmation dialog is currently built as `<div role="dialog" aria-modal="true">` with hand-written focus trapping and an `Escape` key handler, and a teammate asks whether to keep improving it or replace it. Which reasoning matches this lesson\'s rule 1?',
      choices: [
        {
          id: 'a',
          text: 'Keep the hand-rolled version — role="dialog" with aria-modal is already the correct, complete ARIA pattern, so there is nothing to improve.',
        },
        {
          id: 'b',
          text: 'Check whether the native `<dialog>` element with `.showModal()` covers this need first — it provides modal semantics, focus handling, and Escape-to-close natively, which is exactly the "native element already does this" case rule 1 asks you to check before reaching for hand-rolled ARIA.',
        },
        { id: 'c', text: 'Replace it with role="alertdialog" instead, since that role removes the need for any focus management.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The APG\'s own dialog pattern predates wide `<dialog>` support and exists for browsers that lacked it; rule 1 says check for a native equivalent before reimplementing its behavior by hand. `role="alertdialog"` (choice c) changes urgency semantics, not focus management, so it would not remove that work.',
    },
    {
      id: 'q6',
      prompt:
        'A site\'s primary navigation is currently marked up as `<div role="menu">` with `<div role="menuitem">` links, because a developer wanted arrow-key navigation between the top links. What is the concrete cost of that choice, beyond "it\'s not what menu roles are for"?',
      choices: [
        {
          id: 'a',
          text: 'There is no real cost — menu and menuitem roles work identically to nav and link roles for every assistive technology and input method.',
        },
        {
          id: 'b',
          text: 'Screen readers and keyboard users encounter navigation behaving like an application menu (expecting arrow keys, Escape-to-close, one active item at a time) instead of ordinary links, and any browser-native link behavior (open in new tab, copy link address, middle-click) tied to menuitem-role elements may stop working as expected.',
        },
        { id: 'c', text: 'The only cost is a minor SEO penalty, with no effect on assistive technology users.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Role changes behavioral expectations, not just an announced label. menu/menuitem carry APG keyboard conventions (arrow keys, Escape) that visitors don\'t expect from site navigation, and menuitem is not guaranteed to preserve every native anchor behavior the way a real `<a>` inside a `<nav>` does.',
    },
  ],
};
