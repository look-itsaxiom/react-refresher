import { vi } from 'vitest';
vi.mock('../components/Markdown', () => ({ Markdown: ({ source }: { source: string }) => <div>{source}</div> }));

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuizStep } from './QuizStep';
import { progressStore } from '../progress/useProgress';
import { emptyProgress } from '../progress/types';
import type { QuizStep as QuizStepData } from '../../content/types';

const step: QuizStepData = {
  kind: 'quiz', id: 'q', title: 'Quiz',
  questions: [
    { id: 'q1', prompt: 'What is 1+1?', choices: [{ id: 'a', text: '1' }, { id: 'b', text: '2' }], correctChoiceId: 'b', explanation: 'Because arithmetic.' },
    { id: 'q2', prompt: 'Pick B', choices: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], correctChoiceId: 'b', explanation: 'B it is.' },
  ],
};

beforeEach(() => progressStore.replace(emptyProgress()));

describe('QuizStep', () => {
  it('shows one question at a time, gives feedback, and completes when all are answered', async () => {
    const user = userEvent.setup();
    render(<QuizStep step={step} lessonId="l" />);
    expect(screen.getByText('What is 1+1?')).toBeTruthy();
    expect(screen.queryByText('Pick B')).toBeNull();

    await user.click(screen.getByRole('button', { name: '1' }));
    expect(screen.getByText(/not quite/i)).toBeTruthy();
    expect(screen.getByText('Because arithmetic.')).toBeTruthy();
    expect(progressStore.getSnapshot().quiz['l/q']).toEqual({ q1: 'a' });

    await user.click(screen.getByRole('button', { name: /next question/i }));
    expect(screen.getByText('Pick B')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'B' }));
    expect(screen.getByText(/correct/i)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /finish/i }));
    expect(screen.getByText(/you got 1 of 2/i)).toBeTruthy();
    expect(progressStore.getSnapshot().steps['l/q']).toBeDefined();
  });

  it('restores previously answered questions and lets you retake', async () => {
    const user = userEvent.setup();
    progressStore.answerQuiz('l/q', 'q1', 'b');
    progressStore.answerQuiz('l/q', 'q2', 'b');
    progressStore.completeStep('l/q');
    render(<QuizStep step={step} lessonId="l" />);
    expect(screen.getByText(/you got 2 of 2/i)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /retake/i }));
    expect(screen.getByText('What is 1+1?')).toBeTruthy();
    expect(progressStore.getSnapshot().quiz['l/q']).toBeUndefined();
  });
});
