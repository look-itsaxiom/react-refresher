import { fireEvent } from '@testing-library/dom';
import type { Check } from '../../../types';

type StoryModule = {
  scoreStory: (text: string) => {
    sections: { situation: boolean; task: boolean; action: boolean; result: boolean; reflection: boolean };
    wordCount: number;
    hasNumbers: boolean;
    firstPerson: boolean;
    verdict: 'ready' | 'needs-work';
    notes: string[];
  };
  questionsFor: (role: { team: 'small' | 'large'; product: string; onCall: boolean }) => string[];
};

const readyStory = `Situation: A vendor engineer on one of our launch programs kept missing dependency updates because her dashboard only showed tasks she owned, not the tasks blocking her work upstream.

Task: I was asked to find out why vendors felt out of the loop and close the visibility gap before the next program review with the customer.

Action: I interviewed three vendor engineers about their daily workflow, learned they needed to see upstream blockers even on tasks they did not own, and I designed a read-only dependency panel behind a feature flag. I shipped it to one program first, watched adoption for a week, fixed a timezone bug I found, then rolled it out to the rest of the programs.

Result: Vendor-reported blocked-task complaints dropped 60% in the first month, and the customer program manager called it the change that most improved trust in the tool.

Reflection: Next time I would roll the flag out to two programs instead of one, since a single program was not enough signal to catch that timezone bug before it reached everyone.`;

const unlabelledStory = `At the time, the team was onboarding a new customer who wanted visibility into every vendor's schedule, and the background was tricky because two of the vendors were direct competitors on other programs.

My job was to figure out how to keep each vendor's view scoped to only their own tasks. I needed to design an access model that a five-person team could maintain without a dedicated security engineer.

So I proposed a role-based visibility layer, and I built a scoping middleware that filtered every query by company ID before it reached the client. I wrote tests for the two competitor accounts specifically, and I shipped it behind a flag to catch any leak before it reached production.

As a result, we shipped the scoped views without a single cross-company visibility incident, and the security review afterward reduced our open findings by 40%. We saw zero complaints about missing data either.

Looking back, I would document the access model earlier, since in hindsight the ambiguity cost us a week of rework once the second competitor vendor joined the program.`;

const noNumbersStory = `Situation: A customer program manager could not tell which of five vendors was actually at risk of slipping the launch date.

Task: I was asked to build a program-level risk view that rolled up status across every vendor on the program.

Action: I talked to the program manager about how she currently tracked risk, and I built a rollup view that surfaced any vendor with a blocked critical-path task. I shipped it behind a flag and watched her use it for a week.

Result: The program manager said the rollup made her weekly status meeting much shorter and she stopped asking vendors for manual updates.

Reflection: Next time I would ask for a specific metric to track up front, since without one I could not tell how much the tool actually helped.`;

const weHeavyStory = `Situation: Our team noticed that two companies were editing the same schedule and stepping on each other's changes constantly.

Task: We were asked to fix the conflicting-edit problem before it caused a real scheduling error on a live program.

Action: We looked at a few locking strategies together, and we decided on optimistic concurrency with a conflict banner. We built it as a team over two sprints and we tested it with both companies before rollout.

Result: Conflicting edits dropped 45% in the first month after we shipped the fix.

Reflection: Next time we would prototype with real users earlier, since we spent a week building an approach the customer ended up disliking.`;

export const checks: Check[] = [
  {
    name: 'scoreStory: a fully labelled story with numbers and first-person action scores ready',
    run: async ({ mod, expect }) => {
      const { scoreStory } = mod as unknown as StoryModule;
      const score = scoreStory(readyStory);
      expect(score.sections, 'all five sections should be detected').to.deep.equal({
        situation: true,
        task: true,
        action: true,
        result: true,
        reflection: true,
      });
      expect(score.wordCount, 'word count should be within the 120-260 target range').to.be.within(120, 260);
      expect(score.hasNumbers, 'the result section has a percentage').to.equal(true);
      expect(score.firstPerson, 'the action section is written in first person').to.equal(true);
      expect(score.verdict).to.equal('ready');
      expect(score.notes, 'a ready story has no notes').to.deep.equal([]);
    },
  },
  {
    name: 'scoreStory: an unlabelled story is scored by cue keywords, not by labels',
    run: async ({ mod, expect }) => {
      const { scoreStory } = mod as unknown as StoryModule;
      const score = scoreStory(unlabelledStory);
      expect(score.sections, 'cue keywords should place each paragraph in its section').to.deep.equal({
        situation: true,
        task: true,
        action: true,
        result: true,
        reflection: true,
      });
      expect(score.hasNumbers, 'the result paragraph mentions 40%').to.equal(true);
      expect(score.firstPerson, 'the action paragraph is "I"-heavy, not "we"-heavy').to.equal(true);
    },
  },
  {
    name: 'scoreStory: a story with no numbers in the result is flagged and stays needs-work',
    run: async ({ mod, expect }) => {
      const { scoreStory } = mod as unknown as StoryModule;
      const score = scoreStory(noNumbersStory);
      expect(score.sections.result, 'the Result section itself is present').to.equal(true);
      expect(score.hasNumbers).to.equal(false);
      expect(score.verdict).to.equal('needs-work');
      expect(
        score.notes.some((n) => /number/i.test(n)),
        'notes should explain the missing number',
      ).to.equal(true);
    },
  },
  {
    name: 'scoreStory: a "we"-heavy action section is not treated as first person',
    run: async ({ mod, expect }) => {
      const { scoreStory } = mod as unknown as StoryModule;
      const score = scoreStory(weHeavyStory);
      expect(score.sections.action, 'the Action section itself is present').to.equal(true);
      expect(score.firstPerson).to.equal(false);
      expect(score.verdict).to.equal('needs-work');
      expect(
        score.notes.some((n) => /\bwe\b/i.test(n) && /\bi\b/i.test(n)),
        'notes should call out the "we" vs "I" imbalance',
      ).to.equal(true);
    },
  },
  {
    name: 'scoreStory: an empty story reports every section missing and needs-work',
    run: async ({ mod, expect }) => {
      const { scoreStory } = mod as unknown as StoryModule;
      const score = scoreStory('');
      expect(score.sections).to.deep.equal({
        situation: false,
        task: false,
        action: false,
        result: false,
        reflection: false,
      });
      expect(score.wordCount).to.equal(0);
      expect(score.verdict).to.equal('needs-work');
      expect(score.notes.length, 'should explain what is missing').to.be.greaterThan(0);
    },
  },
  {
    name: 'questionsFor: prioritizes on-call and team-size questions correctly',
    run: async ({ mod, expect }) => {
      const { questionsFor } = mod as unknown as StoryModule;

      const onCallSmall = questionsFor({ team: 'small', product: 'launch schedule', onCall: true });
      expect(onCallSmall.length, 'should return a non-trivial list').to.be.greaterThan(2);
      expect(onCallSmall[0], 'the shared-visibility question leads').to.contain('launch schedule');
      expect(
        onCallSmall.some((q) => /on-call/i.test(q)),
        'should ask about the on-call rotation when onCall is true',
      ).to.equal(true);

      const noOnCallLarge = questionsFor({ team: 'large', product: 'launch schedule', onCall: false });
      expect(
        noOnCallLarge.some((q) => /on-call/i.test(q)),
        'should not ask about an on-call rotation when onCall is false',
      ).to.equal(false);
      expect(
        noOnCallLarge.some((q) => /breaks in production/i.test(q)),
        'should substitute a different production-awareness question when there is no on-call rotation',
      ).to.equal(true);
    },
  },
  {
    name: 'the story textarea is reachable by label',
    run: async ({ render, screen, expect, Component }) => {
      render(<Component />);
      const textarea = screen.getByLabelText('Your story');
      expect(textarea.tagName).to.equal('TEXTAREA');
    },
  },
  {
    name: 'typing a ready story flips the verdict and clears the missing-sections list',
    run: async ({ render, screen, expect, Component }) => {
      render(<Component />);
      const textarea = screen.getByLabelText('Your story') as HTMLTextAreaElement;

      fireEvent.change(textarea, { target: { value: readyStory } });

      await screen.findByText(/ready/i);
      expect(screen.queryByText('Situation'), 'Situation should not appear as a missing section').to.equal(null);
      expect(screen.queryByText('Missing sections:'), 'there should be no missing-sections list at all').to.equal(
        null,
      );
    },
  },
  {
    name: 'notes render as individual list items',
    run: async ({ render, screen, expect, Component }) => {
      render(<Component />);
      const textarea = screen.getByLabelText('Your story') as HTMLTextAreaElement;

      fireEvent.change(textarea, { target: { value: noNumbersStory } });

      const notesList = await screen.findByLabelText('Notes');
      const items = notesList.querySelectorAll('li');
      expect(items.length, 'each failing rule should be its own list item').to.be.greaterThan(0);
      expect(notesList.textContent).to.match(/number/i);
    },
  },
  {
    name: 'the Prompts details element lists all eight story prompts',
    run: async ({ render, screen, expect, Component }) => {
      render(<Component />);
      const details = screen.getByText('Prompts').closest('details');
      expect(details, 'expected a <details> element titled "Prompts"').to.not.equal(null);
      const items = details!.querySelectorAll('li');
      expect(items.length, 'should list all eight story prompts').to.equal(8);
    },
  },
];
