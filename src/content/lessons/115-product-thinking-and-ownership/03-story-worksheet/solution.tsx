import { useMemo, useState } from 'react';

export type Sections = { situation: boolean; task: boolean; action: boolean; result: boolean; reflection: boolean };

export type StoryScore = {
  sections: Sections;
  wordCount: number;
  hasNumbers: boolean;
  firstPerson: boolean;
  verdict: 'ready' | 'needs-work';
  notes: string[];
};

const SECTION_ORDER = ['situation', 'task', 'action', 'result', 'reflection'] as const;
type SectionName = (typeof SECTION_ORDER)[number];

const SECTION_LABEL: Record<SectionName, string> = {
  situation: 'Situation',
  task: 'Task',
  action: 'Action',
  result: 'Result',
  reflection: 'Reflection',
};

const CUES: Record<SectionName, string[]> = {
  situation: ['situation', 'at the time', 'we were', 'the team was', 'context', 'background', 'a customer', 'a project', 'joined'],
  task: ['task', 'my job', 'i was asked', 'needed to', 'goal was', 'responsible for', 'assigned'],
  action: ['so i', 'i decided', 'i built', 'i wrote', 'i proposed', 'i talked to', 'i reached out', 'i pushed', 'i pulled', 'i shipped', 'i ran', 'i designed'],
  result: ['as a result', 'we shipped', 'reduced', 'increased', 'result was', 'outcome', 'we saw', '%', 'cut ', 'improved'],
  reflection: ['next time', 'in hindsight', 'looking back', 'i would', "i'd do differently", 'lesson i', 'what i learned'],
};

const LABEL_RE = /^\s*(situation|task|action|result|reflection)\s*:\s*(.*)$/i;

function extractByLabel(text: string): Record<SectionName, string> {
  const content: Record<SectionName, string[]> = { situation: [], task: [], action: [], result: [], reflection: [] };
  const lines = text.split(/\r?\n/);
  let current: SectionName | null = null;
  for (const line of lines) {
    const match = LABEL_RE.exec(line);
    if (match) {
      current = (match[1] ?? '').toLowerCase() as SectionName;
      const inline = (match[2] ?? '').trim();
      if (inline) content[current].push(inline);
    } else if (current) {
      const trimmed = line.trim();
      if (trimmed) content[current].push(trimmed);
    }
  }
  return {
    situation: content.situation.join(' '),
    task: content.task.join(' '),
    action: content.action.join(' '),
    result: content.result.join(' '),
    reflection: content.reflection.join(' '),
  };
}

function extractByCues(text: string): Record<SectionName, string> {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const content: Record<SectionName, string[]> = { situation: [], task: [], action: [], result: [], reflection: [] };

  for (const paragraph of paragraphs) {
    const lower = paragraph.toLowerCase();
    let best: SectionName | null = null;
    let bestHits = 0;
    for (const section of SECTION_ORDER) {
      const hits = CUES[section].filter((cue) => lower.includes(cue)).length;
      if (hits > bestHits) {
        bestHits = hits;
        best = section;
      }
    }
    if (best) content[best].push(paragraph);
  }

  return {
    situation: content.situation.join('\n\n'),
    task: content.task.join('\n\n'),
    action: content.action.join('\n\n'),
    result: content.result.join('\n\n'),
    reflection: content.reflection.join('\n\n'),
  };
}

export function scoreStory(text: string): StoryScore {
  const hasLabels = text.split(/\r?\n/).some((line) => LABEL_RE.test(line));
  const byName = hasLabels ? extractByLabel(text) : extractByCues(text);

  const sections: Sections = {
    situation: byName.situation.trim().length > 0,
    task: byName.task.trim().length > 0,
    action: byName.action.trim().length > 0,
    result: byName.result.trim().length > 0,
    reflection: byName.reflection.trim().length > 0,
  };

  const trimmed = text.trim();
  const wordCount = trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;

  const hasNumbers = sections.result && /[\d%]/.test(byName.result);

  const iCount = sections.action ? (byName.action.match(/\bI\b/g) ?? []).length : 0;
  const weCount = sections.action ? (byName.action.match(/\bwe\b/gi) ?? []).length : 0;
  const firstPerson = sections.action && iCount > weCount;

  const notes: string[] = [];
  for (const section of SECTION_ORDER) {
    if (!sections[section]) {
      notes.push(
        section === 'situation'
          ? 'Add a Situation section — what was the context?'
          : section === 'task'
            ? 'Add a Task section — what were you responsible for?'
            : section === 'action'
              ? 'Add an Action section — what did you specifically do?'
              : section === 'result'
                ? 'Add a Result section — what happened, with a number?'
                : 'Add a Reflection section — what would you do differently?',
      );
    }
  }
  if (wordCount < 120) {
    notes.push(`Story is ${wordCount} words; aim for 120–260 words (about 90 seconds spoken).`);
  } else if (wordCount > 260) {
    notes.push(`Story is ${wordCount} words; aim for 120–260 words (about 90 seconds spoken).`);
  }
  if (sections.result && !hasNumbers) {
    notes.push('Add a number to the Result section — a percentage, a count, or time saved.');
  }
  if (sections.action && !firstPerson) {
    notes.push('Action section reads as "we" more than "I" — describe your specific action, not the team\'s.');
  }

  const verdict: StoryScore['verdict'] =
    sections.situation &&
    sections.task &&
    sections.action &&
    sections.result &&
    sections.reflection &&
    wordCount >= 120 &&
    wordCount <= 260 &&
    hasNumbers &&
    firstPerson
      ? 'ready'
      : 'needs-work';

  return { sections, wordCount, hasNumbers, firstPerson, verdict, notes };
}

export type Role = { team: 'small' | 'large'; product: string; onCall: boolean };

export function questionsFor(role: Role): string[] {
  const questions: string[] = [
    `How do different roles see different views of the same ${role.product}?`,
    'How does a change get from a PR to production?',
  ];
  questions.push(
    role.onCall
      ? 'What does the on-call rotation look like?'
      : 'How does the team find out when something breaks in production?',
  );
  questions.push(
    role.team === 'small'
      ? 'How do product decisions get made on a small team?'
      : 'How do product decisions get made on a team this large?',
  );
  questions.push("What's the hardest coordination problem a customer has brought you?");
  return questions;
}

const PROMPTS = [
  'A time you changed a spec after talking to a user',
  'A performance problem you found and fixed, with numbers',
  'An incident you owned end to end',
  'Disagreeing with a designer or PM, and how it resolved',
  'A migration or refactor you sequenced safely',
  'A time you cut scope, and how you communicated it',
  'Onboarding to an unfamiliar stack fast',
  'A security or data-visibility concern you raised',
];

const SECTION_KEYS: SectionName[] = SECTION_ORDER as unknown as SectionName[];

export function StoryWorksheet() {
  const [text, setText] = useState('');
  const score = useMemo(() => scoreStory(text), [text]);
  const missing = SECTION_KEYS.filter((s) => !score.sections[s]);

  return (
    <div>
      <label htmlFor="story-text">Your story</label>
      <textarea id="story-text" value={text} onChange={(e) => setText(e.target.value)} rows={10} cols={60} />

      <section aria-label="Score">
        <p>Verdict: {score.verdict === 'ready' ? 'Ready' : 'Needs work'}</p>
        <p>Word count: {score.wordCount}</p>
        {missing.length > 0 && (
          <div>
            <p>Missing sections:</p>
            <ul>
              {missing.map((s) => (
                <li key={s}>{SECTION_LABEL[s]}</li>
              ))}
            </ul>
          </div>
        )}
        {score.notes.length > 0 && (
          <ul aria-label="Notes">
            {score.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
      </section>

      <details>
        <summary>Prompts</summary>
        <ul>
          {PROMPTS.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

export default StoryWorksheet;
