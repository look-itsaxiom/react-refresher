import { useState } from 'react';

export type Sections = { situation: boolean; task: boolean; action: boolean; result: boolean; reflection: boolean };

export type StoryScore = {
  sections: Sections;
  wordCount: number;
  hasNumbers: boolean;
  firstPerson: boolean;
  verdict: 'ready' | 'needs-work';
  notes: string[];
};

// TODO: detect Situation/Task/Action/Result/Reflection sections (labelled lines, or
// cue-keyword paragraphs when there are no labels — see prompt.md for the exact rules),
// then compute wordCount, hasNumbers, firstPerson, and a verdict from them.
export function scoreStory(text: string): StoryScore {
  return {
    sections: { situation: false, task: false, action: false, result: false, reflection: false },
    wordCount: text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length,
    hasNumbers: false,
    firstPerson: false,
    verdict: 'needs-work',
    notes: [],
  };
}

export type Role = { team: 'small' | 'large'; product: string; onCall: boolean };

// TODO: return a prioritized question list — see prompt.md for the bank and ordering rules.
export function questionsFor(_role: Role): string[] {
  return [];
}

// TODO: render a labelled textarea, a live score panel (verdict, word count, missing
// sections, notes), and a "Prompts" <details> listing the eight story prompts.
export function StoryWorksheet() {
  const [text, setText] = useState('');
  return (
    <div>
      <label htmlFor="story-text">Your story</label>
      <textarea id="story-text" value={text} onChange={(e) => setText(e.target.value)} rows={10} cols={60} />
    </div>
  );
}

export default StoryWorksheet;
