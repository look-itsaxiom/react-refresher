import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A component has a `size` prop with three valid values, but only two of them appear in any story. A teammate says this is fine because the component "obviously" works for the third value too. What is the actual risk, and what should happen before merging?',
      choices: [
        { id: 'a', text: 'No risk — TypeScript already guarantees the prop only accepts those three values, so runtime behavior for all three is assured.' },
        { id: 'b', text: 'A story is the only place autodocs, the a11y addon, and visual regression actually look — an unexercised value is untested for rendering, contrast, and layout regardless of what TypeScript allows, so add the missing story before merging.' },
        { id: 'c', text: 'It only matters if the missing value is the default; non-default values are lower priority and can be covered later.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'TypeScript checks that a caller passes a valid value, not that the component renders that value correctly. Autodocs, the a11y audit, and visual regression all operate on stories, so a value with no story is invisible to every one of those checks — "the type system allows it" and "it has been verified" are unrelated claims.',
    },
    {
      id: 'q2',
      prompt:
        "A design-system Storybook has `tags: ['autodocs']` set globally and no `argTypes` written by hand anywhere. A reviewer flags this as incomplete. Are they right?",
      choices: [
        { id: 'a', text: 'No — Storybook infers argTypes and their controls from the component\'s TypeScript props via react-docgen, so a well-typed component needs no hand-written argTypes at all.' },
        { id: 'b', text: 'Yes — argTypes must always be written by hand; autodocs only generates the page layout, never the controls table.' },
        { id: 'c', text: 'It depends entirely on whether the project uses MDX; without MDX, argTypes inference is disabled.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'react-docgen reads a component\'s prop types and infers a matching control (boolean → toggle, string union → select, string → text) with zero manual argTypes. Hand-written argTypes are for overriding an inferred control or documenting something TypeScript can\'t express, not a prerequisite for autodocs to work at all.',
    },
    {
      id: 'q3',
      prompt:
        'A team wires up Chromatic and TurboSnap, then notices that changing a single deeply-shared `Text` component still triggers new snapshots for nearly every story in the library, while a change to a leaf component only re-snapshots a handful of stories. Is TurboSnap broken?',
      choices: [
        { id: 'a', text: 'Yes — TurboSnap should always re-snapshot the same small number of stories regardless of what changed.' },
        { id: 'b', text: 'No — TurboSnap traces the dependency graph from the git diff to the stories that depend on the changed file, and a widely-shared component like Text is, correctly, a dependency of almost every story, so a large re-snapshot set is the accurate result, not a bug.' },
        { id: 'c', text: 'Yes — TurboSnap only tracks changes to .stories files directly, so a change to a shared component file should never affect the snapshot count.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'TurboSnap\'s whole mechanism is dependency-graph tracing from the git diff, so the number of affected stories should scale with how many stories actually depend on the changed file. A component near the root of the dependency graph legitimately affects nearly everything; a leaf component legitimately affects almost nothing. Both outcomes are the tool working as designed.',
    },
    {
      id: 'q4',
      prompt:
        'A design-handoff drift check flags a Figma component\'s `variant` property (options: Primary, Secondary) against a code prop of the same name with options `["primary", "secondary", "tertiary"]`, as `options-differ`. A teammate says this is a false positive because "primary" and "Primary" are obviously the same value. Are they right to dismiss it?',
      choices: [
        { id: 'a', text: 'Yes — any options-differ report is inherently unreliable and should be ignored.' },
        { id: 'b', text: 'No — the comparison is already case-insensitive, so "primary" vs "Primary" is not what triggered this; the actual difference is a genuine one: code has a third option, "tertiary", that Figma does not, which is a real handoff drift worth investigating.' },
        { id: 'c', text: 'Yes, but only because option order differs between the two lists.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A well-built drift check normalizes case (and order) before comparing option sets, so casing alone should never produce a report. When a report does fire, the cause is a real set difference — here, an extra "tertiary" option that exists in code but was never added to the Figma component, exactly the kind of drift the check exists to catch.',
    },
    {
      id: 'q5',
      prompt:
        'A team starts using Figma\'s MCP server to generate React code directly from selected frames and ships the output with minimal review. Six months later the component library has a dozen near-duplicate card layouts, each hand-rolled with inline styles instead of the shared `Card` component. What went wrong, and what review step would have prevented it?',
      choices: [
        { id: 'a', text: 'The MCP server itself is unreliable and should not be used at all; the fix is to stop using AI-generated code entirely.' },
        { id: 'b', text: 'AI design-to-code tools reproduce what\'s on the canvas faithfully but have no visibility into which components already exist in the library — a review step asking "does this decompose into components we already have" catches exactly this before it merges, whether the first draft was AI-generated or hand-copied.' },
        { id: 'c', text: 'The problem is Figma\'s fault for not enforcing component reuse at the design-file level; nothing in the code review process could have caught this.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Design-to-code generation is good at matching pixels, not at knowing your codebase already has a Card component this layout should use. That gap is a review problem, not a tooling failure — the same discipline that catches a junior engineer copying pixels by eye also catches an AI-generated first draft doing the same thing.',
    },
    {
      id: 'q6',
      prompt:
        'A component has stories for every variant, an accepted visual baseline, and a docs description, but no Code Connect link to its Figma source and the a11y addon has never been run against it. Is it ready to call "done" for a design-system release?',
      choices: [
        { id: 'a', text: 'Yes — stories, a visual baseline, and docs are the three things that matter; a11y and the Figma link are nice-to-haves that can follow later without blocking a release.' },
        { id: 'b', text: 'No — a definition of done that only checks story coverage, visual baseline, and docs would ship an unaudited component with no verified link back to its design source; both a11y and the Figma link are part of the same checklist for a reason.' },
        { id: 'c', text: 'Yes, as long as the component passed a manual visual review by a designer, which implicitly covers both accessibility and design fidelity.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A manual visual pass does not catch contrast or keyboard-navigation failures the way an automated a11y audit does, and it does not substitute for an explicit, checkable link between the Figma source and the shipped component. A definition of done exists precisely so partial completion doesn\'t get waved through as finished.',
    },
  ],
};
