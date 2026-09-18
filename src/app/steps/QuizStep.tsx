import { useState } from 'react';
import type { QuizStep as QuizStepData } from '../../content/types';
import { stepKey } from '../../content/registry';
import { progressStore, useProgress } from '../progress/useProgress';
import { Markdown } from '../components/Markdown';
import { Button } from '../components/Button';

export function QuizStep({ step, lessonId }: { step: QuizStepData; lessonId: string }) {
  const key = stepKey(lessonId, step.id);
  const progress = useProgress();
  const answers = progress.quiz[key] ?? {};
  const done = progress.steps[key] !== undefined;
  const firstUnanswered = step.questions.findIndex((q) => answers[q.id] === undefined);
  const [index, setIndex] = useState(() => (firstUnanswered === -1 ? step.questions.length : firstUnanswered));

  const correctCount = step.questions.filter((q) => answers[q.id] === q.correctChoiceId).length;

  if (done || index >= step.questions.length) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-8">
        <h2 className="text-2xl font-semibold">Quiz complete</h2>
        <p className="mt-2 text-lg">You got {correctCount} of {step.questions.length}.</p>
        <ul className="mt-6 space-y-4">
          {step.questions.map((q) => {
            const chosen = answers[q.id];
            const ok = chosen === q.correctChoiceId;
            return (
              <li key={q.id} className="rounded-lg border border-border bg-surface-2 p-4">
                <Markdown source={q.prompt} />
                <p className={`text-sm mt-1 ${ok ? 'text-success' : 'text-danger'}`}>
                  {ok ? 'Correct' : `You chose "${q.choices.find((c) => c.id === chosen)?.text ?? '—'}"; correct: "${q.choices.find((c) => c.id === q.correctChoiceId)?.text}"`}
                </p>
                <div className="text-sm text-ink-muted"><Markdown source={q.explanation} /></div>
              </li>
            );
          })}
        </ul>
        <div className="mt-6">
          <Button variant="ghost" onClick={() => { progressStore.clearQuiz(key); setIndex(0); }}>Retake quiz</Button>
        </div>
      </section>
    );
  }

  const question = step.questions[index]!;
  const chosen = answers[question.id];
  const answered = chosen !== undefined;
  const isLast = index === step.questions.length - 1;

  return (
    <section className="mx-auto max-w-3xl px-6 py-8">
      <p className="text-xs uppercase tracking-wide text-ink-muted">Question {index + 1} of {step.questions.length}</p>
      <div className="mt-2 text-lg"><Markdown source={question.prompt} /></div>
      <div className="mt-4 grid gap-2">
        {question.choices.map((c) => {
          const isChosen = chosen === c.id;
          const isCorrect = c.id === question.correctChoiceId;
          let cls = 'border-border hover:border-accent';
          if (answered && isCorrect) cls = 'border-success bg-success/10';
          else if (answered && isChosen) cls = 'border-danger bg-danger/10';
          return (
            <button
              key={c.id}
              type="button"
              disabled={answered}
              onClick={() => progressStore.answerQuiz(key, question.id, c.id)}
              className={`text-left rounded-md border px-4 py-3 transition-colors disabled:cursor-default ${cls}`}
            >
              {c.text}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className="mt-4 rounded-md border border-border bg-surface-2 p-4">
          <p className={`font-medium ${chosen === question.correctChoiceId ? 'text-success' : 'text-danger'}`}>
            {chosen === question.correctChoiceId ? 'Correct!' : 'Not quite.'}
          </p>
          <div className="text-sm"><Markdown source={question.explanation} /></div>
          <div className="mt-3">
            {isLast ? (
              <Button onClick={() => { progressStore.completeStep(key); setIndex(index + 1); }}>Finish quiz</Button>
            ) : (
              <Button onClick={() => setIndex(index + 1)}>Next question</Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
