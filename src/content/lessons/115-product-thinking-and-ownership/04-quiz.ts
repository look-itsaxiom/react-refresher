import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A PM asks for a full drag-and-drop schedule editor. You have two days before the next customer check-in, not three weeks. What is the strongest move?',
      choices: [
        { id: 'a', text: 'Build the editor as specced, working extra hours to hit the deadline.' },
        {
          id: 'b',
          text: "Ask what decision the customer needs to make with this, then propose a smaller, reversible slice — e.g. a read-only risk view — shipped behind a flag, so the team learns whether that's even the right frame before committing to the full editor.",
        },
        { id: 'c', text: 'Tell the PM the spec is unrealistic and wait for them to descope it.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Pushing back well means proposing a smaller version that tests the same underlying assumption faster, not silently complying or blocking on someone else to change the ask. The flag makes the smaller slice reversible if it turns out wrong.",
    },
    {
      id: 'q2',
      prompt: 'On a team with "no handoff culture," what does "own it" imply about a feature you ship, beyond writing working code?',
      choices: [
        { id: 'a', text: 'Nothing extra — ownership ends once the PR merges and CI is green.' },
        {
          id: 'b',
          text: "You're the one who gets paged if it breaks, so you need enough observability to know it's broken before a customer tells you, and a runbook someone else could follow without you.",
        },
        { id: 'c', text: 'It means you personally review every future PR that touches that code.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'With no handoff culture, there is no downstream team to catch what monitoring or documentation you skipped. Ownership through production — observability plus a runbook — is what makes "own it" survivable at 2 a.m. rather than heroic.',
    },
    {
      id: 'q3',
      prompt:
        'An interviewer asks you to estimate a feature: "let vendors mark a task blocked, with a reason." Which estimate best reflects treating UX polish as an engineering requirement?',
      choices: [
        { id: 'a', text: '"One day — it\'s just a status field and a text input."' },
        {
          id: 'b',
          text: '"One day for the core flow, plus half a day for the empty/error states and a keyboard-only path, since a vendor blocking a task under time pressure is exactly when a clunky flow costs the most."',
        },
        { id: 'c', text: '"I\'ll estimate the feature now and file a follow-up ticket for the empty states and accessibility later."' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Empty states, error states, and keyboard paths are part of the feature, not extras to defer. Costing them into the estimate up front is what keeps them from becoming a ticket that never gets prioritized.',
    },
    {
      id: 'q4',
      prompt:
        'In a "tell me about a time you disagreed with a designer" answer, which detail most strengthens the story?',
      choices: [
        { id: 'a', text: 'A confident description of why you were right and the designer came around.' },
        {
          id: 'b',
          text: 'A description of what the actual disagreement turned out to be (often not "should we build X" but "what does X need to do"), and how the resolution — whichever way it went — made the product better.',
        },
        { id: 'c', text: 'Naming the designer and quoting their exact words during the disagreement.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The signal an interviewer is listening for is whether you can find the real disagreement underneath the surface one, and whether the resolution improved the product — not whether you won the argument.',
    },
    {
      id: 'q5',
      prompt:
        'Asked "what does the on-call rotation look like," the founder says "we don\'t really have outages." How should you weigh that answer?',
      choices: [
        { id: 'a', text: 'As reassuring — a mature engineering culture with no incidents.' },
        {
          id: 'b',
          text: "As a red flag — every system serving customers has outages; the question is whether there's a process (rotation, runbooks, a postmortem habit) for handling them, or whether they're informally absorbed by whoever's around.",
        },
        { id: 'c', text: 'As neutral information that needs no further follow-up.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '"We don\'t really have outages" is a claim no real production system can make truthfully. It signals either an undertested product or a team that doesn\'t track incidents — worth a direct follow-up question, not taking at face value.',
    },
    {
      id: 'q6',
      prompt:
        'How should you describe using AI coding agents when asked about it directly in this interview?',
      choices: [
        { id: 'a', text: 'Downplay it — claim you write everything by hand to avoid seeming less skilled.' },
        {
          id: 'b',
          text: "Describe using agents for scaffolding and first drafts, and describe how you verify their output — reading the diff, running the tests, reviewing line by line anything that touches money, auth, or data visibility — scaled to the change's blast radius.",
        },
        { id: 'c', text: 'Say you trust agent output by default since the tools are reliable enough now.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The team will assume you use these tools; the differentiator is whether you can describe your verification discipline. On a "no handoff culture" team, there is no downstream reviewer to catch what an agent got wrong, so that discipline matters more, not less.',
    },
  ],
};
