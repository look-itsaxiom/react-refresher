import type { render } from '@testing-library/react';
import type { screen, within } from '@testing-library/dom';
import type userEvent from '@testing-library/user-event';
import type { act, ComponentType } from 'react';
import type { expect as chaiExpect } from 'chai';

export type TrackId = 'refresher' | 'react18' | 'react19' | 'compiler' | 'ecosystem' | 'server';

export type Track = { id: TrackId; title: string; description: string };

export type PlannedLesson = { id: string; title: string; summary: string; track: TrackId };

export type ConceptStep = { kind: 'concept'; id: string; title: string; markdown: string };

export type QuizChoice = { id: string; text: string };
export type QuizQuestion = {
  id: string;
  prompt: string; // markdown
  choices: QuizChoice[];
  correctChoiceId: string;
  explanation: string; // markdown, shown after answering
};
export type QuizStep = { kind: 'quiz'; id: string; title: string; questions: QuizQuestion[] };

/** Controls over the simulated server, available to checks. */
export type ServerControls = {
  reset(): void;
  setLatency(ms: number): void;
  failNext(message?: string): void;
};

export type CheckContext = {
  /** The user's compiled entry module. Evaluated lazily on first access, so configure `server` first. */
  readonly mod: Record<string, unknown>;
  /** `mod.default ?? mod.App`, typed loosely for rendering. */
  readonly Component: ComponentType;
  render: typeof render;
  screen: typeof screen;
  within: typeof within;
  user: ReturnType<typeof userEvent.setup>;
  act: typeof act;
  expect: typeof chaiExpect;
  server: ServerControls;
  /** Resolves after `ms` milliseconds. */
  sleep(ms: number): Promise<void>;
};

export type Check = {
  name: string;
  run: (ctx: CheckContext) => Promise<void> | void;
};

export type ExerciseStep = {
  kind: 'exercise';
  id: string;
  title: string;
  prompt: string; // markdown
  files: Record<string, string>; // starter files by filename
  solution: Record<string, string>;
  hints: string[];
  checks: Check[];
  entry?: string; // default 'App.tsx'
};

export type Step = ConceptStep | ExerciseStep | QuizStep;

export type Lesson = {
  id: string;
  title: string;
  track: TrackId;
  summary: string;
  steps: Step[];
};

export type LessonView = { planned: PlannedLesson; lesson: Lesson | undefined };
export type TrackView = { track: Track; lessons: LessonView[] };
