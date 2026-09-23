import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: '05-quiz',
  title: 'Quiz',
  questions: [
    {
      id: 'time-allocation',
      prompt:
        'You have a 6-hour take-home. At the 3-hour mark, the core API works but you have no tests, no README, and CI isn\'t set up. What should you do?',
      choices: [
        { id: 'a', text: 'Keep building features for another hour, then do tests/README/CI in the last two hours' },
        { id: 'b', text: 'Stop adding features now and spend the remaining time on tests, README, and CI, even if it means cutting a planned feature' },
        { id: 'c', text: 'Skip tests entirely to leave more time for the README, since reviewers read the README first' },
        { id: 'd', text: 'Keep building until time runs out, and write the README in the last ten minutes' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The README/tests/CI block is worth roughly the last 35% of the budget on its own, and it\'s the block reviewers read first and weight heavily. Running out of time on it because features ran long is the single most common way a technically fine submission scores badly. Skipping tests entirely trades one graded signal for another instead of protecting both.',
    },
    {
      id: 'not-done-section',
      prompt:
        'Your submission is missing pagination on a list endpoint that would obviously matter at scale. What\'s the best way to handle this in your README?',
      choices: [
        { id: 'a', text: 'Don\'t mention it -- drawing attention to a gap only hurts your score' },
        { id: 'b', text: 'Mention it under "not done," name why (time), and optionally what you\'d do (a keyset cursor)' },
        { id: 'c', text: 'Implement a fake pagination UI that doesn\'t actually paginate, so it looks finished' },
        { id: 'd', text: 'Apologize extensively in the README about running out of time' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Reviewers score a named, reasoned gap as evidence of judgment, not as a deduction -- it shows you noticed the limitation and made a deliberate call under time pressure. Staying silent risks looking like you didn\'t notice, which reads worse than naming it. A one-line note beats both silence and padding.',
    },
    {
      id: 'seniority-signal',
      prompt:
        'Which of these is the strongest single signal of seniority in a take-home\'s backend, independent of whether every feature is finished?',
      choices: [
        { id: 'a', text: 'Using the newest available framework version' },
        { id: 'b', text: 'A numbered schema migration file instead of CREATE TABLE run by hand, plus request-scoped context and timeouts' },
        { id: 'c', text: 'A very large number of small helper functions' },
        { id: 'd', text: 'A UI with more animations than the prompt asked for' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Migrations and context/timeout discipline are specifically the details a rushed or junior submission skips because they don\'t show up in a quick manual test -- they only matter once the code has to survive contact with a team or with load. Framework freshness and extra polish don\'t signal the same thing.',
    },
    {
      id: 'cycle-detection-location',
      prompt:
        'Why does the template detect dependency cycles in Go rather than with a Postgres CHECK constraint?',
      choices: [
        { id: 'a', text: 'CHECK constraints can\'t run arbitrary queries against other rows, so they can\'t express "no cycle of any length" across the whole graph' },
        { id: 'b', text: 'Go is faster than Postgres at this kind of check' },
        { id: 'c', text: 'CHECK constraints only work on numeric columns' },
        { id: 'd', text: 'It\'s arbitrary -- either location works equally well and it doesn\'t matter which you pick' },
      ],
      correctChoiceId: 'a',
      explanation:
        'A CHECK constraint evaluates a row against a fixed expression at insert/update time; it can\'t traverse an arbitrary-length chain of other rows to ask "does this new edge close a cycle." A self-loop (a CHECK (predecessor_id <> successor_id)) is the one case a plain constraint can express -- a longer cycle needs a graph walk, which lives in application code (or a plpgsql trigger) instead.',
    },
    {
      id: 'giant-commit',
      prompt:
        'A submission has clean, correct code but a single commit touching 60 files, made at the deadline. How does this rubric treat it?',
      choices: [
        { id: 'a', text: 'It\'s a hard blocker -- the score is capped low regardless of code quality' },
        { id: 'b', text: 'It\'s a suggestion, not a blocker -- it costs no points but signals the commit history is unreviewable' },
        { id: 'c', text: 'It\'s ignored entirely -- commit history never matters if the final code is correct' },
        { id: 'd', text: 'It automatically doubles the score, since it shows the feature was finished in one push' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A single giant commit doesn\'t make the code wrong, so it isn\'t scored like a blocker (secrets, no tests, an unusable README) -- but it does erase the one piece of evidence a reviewer has about how you worked, which is exactly what commit history is for. That\'s a suggestion-level note, not a score cap.',
    },
    {
      id: 'follow-up-interview',
      prompt:
        'In the follow-up interview about your take-home, the strongest way to open when asked "walk me through a decision" is to:',
      choices: [
        { id: 'a', text: 'Give a tour of every file in the repo, in order' },
        { id: 'b', text: 'Pick one real tradeoff you made (e.g. DFS cycle check vs. a SQL constraint) and be ready to defend it' },
        { id: 'c', text: 'Point out everything you would have done differently with more time, without naming what you actually chose' },
        { id: 'd', text: 'Wait for the interviewer to ask specific questions rather than volunteering anything' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Reviewers ask this to see whether you can defend a real decision under a few follow-up questions, not to get a tour. One well-chosen tradeoff, explained clearly, demonstrates judgment; a full-repo walkthrough or a list of regrets does not. Naming gaps from your own README before being asked is a version of the same move that works well in this format.',
    },
  ],
};
