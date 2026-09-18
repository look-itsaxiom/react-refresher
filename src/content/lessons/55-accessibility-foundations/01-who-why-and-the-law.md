## Who you're building for

"Accessibility" sounds like it means blind users and screen readers. That's one slice of it.
The people affected by inaccessible interfaces include:

- **Blind and low-vision users** — screen readers (NVDA, JAWS, VoiceOver, TalkBack), screen
  magnifiers, high-contrast modes, and browser zoom past 200%.
- **Motor-impaired users** — keyboard-only navigation, switch access (one or two buttons
  scanning through focusable elements), eye-tracking, and voice control (Voice Access, Voice
  Control) that clicks by saying an element's visible label out loud.
- **Deaf and hard-of-hearing users** — captions, transcripts, and visual equivalents of audio
  cues.
- **Cognitive and learning disabilities** — consistent layout, plain language, generous time
  limits, and forms that don't punish a wrong keystroke by silently clearing themselves.
- **Situational and temporary impairments** — a broken arm, a bright sunny screen, a crashing
  toddler in one arm and a phone in the other, a noisy room where captions substitute for audio,
  a hotel with a cheap trackpad. Everyone who ships software will, at some point, be one of these
  users. This is the strongest argument for treating accessibility as a quality attribute rather
  than a compliance checkbox: the code paths that make a page usable with a screen reader are
  frequently the same code paths that make it usable one-handed, on a bad connection, or half
  paying attention.

Voice control deserves a specific callout because it depends on something most engineers never
think about: **the visible label has to match the accessible name.** Voice Control says "click
sign up" by matching your spoken words against each element's computed accessible name — if a
button's visible text is "Sign up" but its `aria-label` says "Submit registration form," voice
users can't reach it by reading the label off the screen. Keep visible text and accessible name
in sync unless you have a specific reason not to.

## POUR: the model everything else hangs off

WCAG organizes every requirement under four principles, and it's worth internalizing them because
they're a fast way to categorize a bug you're looking at:

- **Perceivable** — content has to be presentable to the senses a user has available: alt text
  for images, captions for video, sufficient color contrast, text that isn't conveyed through
  color alone.
- **Operable** — everything reachable by mouse has to be reachable by keyboard, with visible
  focus, no keyboard traps, and enough time to act.
- **Understandable** — predictable behavior, readable language, and error messages that say
  what's wrong and how to fix it.
- **Robust** — content works across browsers and assistive technologies now and as they evolve —
  which in practice means: use real, valid, standard HTML semantics rather than reinventing them.

## WCAG levels and what's actually new in 2.2

WCAG success criteria are graded **A** (minimum), **AA** (the level almost every law and
contract cites), and **AAA** (aspirational, not usually a global site-wide target). "WCAG 2.2 AA"
is the de facto industry bar in 2026, and has been since the specification reached Recommendation
status in October 2023.

WCAG 2.2 added nine success criteria on top of 2.1, all worth knowing by name because they target
gaps the older versions genuinely missed:

- **Focus Not Obscured** (AA/AAA) — a sticky header or cookie banner can no longer completely
  hide the element that currently has keyboard focus.
- **Focus Appearance** (AAA) — a minimum visible size and contrast for the focus indicator itself.
- **Dragging Movements** (AA) — anything operated by a drag gesture (a slider, a reorderable
  list) needs a single-pointer alternative, like tap-to-select-then-tap-to-place.
- **Target Size Minimum** (AA) — pointer targets need to be at least 24×24 CSS pixels, with
  exceptions for inline text links and cases where a smaller target already has 24px of
  surrounding spacing.
- **Consistent Help** (A) — if a help mechanism (a link, chat widget, phone number) appears on
  multiple pages, it has to stay in the same relative place in the tab and reading order.
- **Redundant Entry** (A) — don't make a user re-enter information they already gave you earlier
  in the same process, unless it's a required re-confirmation (like re-entering a password) or
  the original value has to be re-verified for security.
- **Accessible Authentication** (AA/AAA) — a login flow can't rely purely on a cognitive test
  (remembering a password, solving a puzzle CAPTCHA) without also offering something that doesn't
  demand memory or puzzle-solving, such as a password manager being allowed to autofill, or a
  passkey/magic-link path.

None of these existed in WCAG 2.0 or 2.1. If you last seriously studied WCAG before late 2023,
this is the set to go read in full.

**WCAG 3.0** is still a W3C Working Draft, not a Recommendation — it introduces a very different
scoring model (a 0–4 outcome scale instead of pass/fail criteria) but has no ratified target date
and existing regulation doesn't cite it. Design and build against 2.2 AA; treat 3.0 as something
to watch, not something to implement yet.

## The legal landscape, briefly

Three regulatory tracks converge on the same practical target, WCAG 2.2 AA:

- **The European Accessibility Act (EAA)** took effect for covered products and services across
  EU member states on June 28, 2025. It applies to e-commerce, banking, transport ticketing, and
  more, references **EN 301 549** (the EU's harmonized accessibility standard, itself aligned to
  WCAG's AA success criteria) as its technical benchmark, and carries penalties that member
  states set individually — figures cited up to roughly €100,000 or a percentage of annual
  revenue depending on the country. It applies to any business selling into the EU, not only
  EU-based ones.
- **ADA Title II** — the US Department of Justice's April 2024 rule requires state and local
  government web content and mobile apps to conform to WCAG 2.1 AA. The original compliance
  dates (April 2026 for larger public entities, April 2027 for smaller ones) were pushed back a
  year by a DOJ interim final rule in 2026, citing resource constraints; check current guidance
  before treating either date as final for a specific project.
- **Section 508** governs US federal agencies and contractors and, as of this writing, still
  references the older WCAG 2.0 AA by regulatory text from its 2017 refresh; an update aligning
  it to 2.2 has been anticipated but was not finalized as of this writing — build to 2.2 AA
  regardless, since it's a strict superset of what 2.0 required.

None of this is exhaustive legal advice, and none of it changes the engineering answer: build to
WCAG 2.2 AA by default, and you're inside every one of these frameworks without having to track
which law applies to which page.

## The WebAIM Million: the same handful of bugs, at scale

WebAIM automatically scans the home pages of the top one million sites every year. The 2025 run
found detectable WCAG 2 A/AA failures on **94.8%** of home pages, and just **six** categories of
error — led by low color contrast (on about 79% of pages) and missing alternative text for images
(about 55%) — account for **96%** of all errors detected. This matters for how you spend your
attention: the long tail of exotic ARIA misuse is real, but the bulk of the web's inaccessibility
is a small number of boring, cheap-to-fix mistakes repeated everywhere. The exercises in this
track start with exactly those.

## Further reading

- [W3C — What's New in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
- [W3C — WCAG 2.2 Recommendation](https://www.w3.org/TR/WCAG22/)
- [WebAIM — The WebAIM Million 2025](https://webaim.org/projects/million/2025)
- [ADA.gov — Title II Web and Mobile App Accessibility Rule](https://www.ada.gov/resources/2024-03-08-web-rule/)
