import { useEffect } from 'react';
import { Link, NavLink, useNavigate, useParams } from 'react-router';
import { getLesson, stepKey } from '../content/registry';
import { progressStore, useProgress } from './progress/useProgress';
import { ConceptStep } from './steps/ConceptStep';
import { QuizStep } from './steps/QuizStep';
import { ExerciseStep } from './steps/ExerciseStep';
import { Button } from './components/Button';

const kindLabel = { concept: 'Read', exercise: 'Code', quiz: 'Quiz' } as const;

export function LessonPage() {
  const { lessonId = '', stepIndex: stepIndexParam } = useParams();
  const navigate = useNavigate();
  const lesson = getLesson(lessonId);
  const progress = useProgress();
  const index = Math.max(0, Math.min(Number(stepIndexParam ?? 0) || 0, (lesson?.steps.length ?? 1) - 1));
  const step = lesson?.steps[index];

  useEffect(() => {
    if (lesson) progressStore.setLastVisited(`/lesson/${lesson.id}/${index}`);
  }, [lesson, index]);

  if (!lesson || !step) {
    return (
      <div className="p-8">
        <p>That lesson does not exist (yet).</p>
        <Link to="/" className="text-accent underline">Back to dashboard</Link>
      </div>
    );
  }

  const isLast = index === lesson.steps.length - 1;
  const isExercise = step.kind === 'exercise';

  return (
    <div className="flex h-[calc(100vh-3rem)]">
      <aside className="w-64 shrink-0 border-r border-border bg-surface-2 overflow-y-auto">
        <div className="p-4 border-b border-border">
          <Link to="/" className="text-xs text-ink-muted hover:text-ink">← Dashboard</Link>
          <h1 className="mt-1 font-semibold leading-tight">{lesson.title}</h1>
        </div>
        <ol className="p-2">
          {lesson.steps.map((s, i) => {
            const done = progress.steps[stepKey(lesson.id, s.id)] !== undefined;
            return (
              <li key={s.id}>
                <NavLink
                  to={`/lesson/${lesson.id}/${i}`}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${isActive ? 'bg-surface-3 text-ink' : 'text-ink-muted hover:text-ink'}`
                  }
                >
                  <span className={`h-2 w-2 rounded-full ${done ? 'bg-success' : 'bg-border'}`} aria-hidden />
                  <span className="text-[10px] uppercase tracking-wide w-9 text-ink-muted">{kindLabel[s.kind]}</span>
                  <span className="truncate">{s.title}</span>
                </NavLink>
              </li>
            );
          })}
        </ol>
      </aside>

      <section className="flex-1 min-w-0 flex flex-col">
        <div className={`flex-1 min-h-0 ${isExercise ? '' : 'overflow-y-auto'}`}>
          {step.kind === 'concept' && <ConceptStep key={step.id} step={step} lessonId={lesson.id} />}
          {step.kind === 'quiz' && <QuizStep key={step.id} step={step} lessonId={lesson.id} />}
          {step.kind === 'exercise' && <ExerciseStep key={step.id} step={step} lessonId={lesson.id} />}
        </div>
        <footer className="border-t border-border bg-surface-2 px-4 py-2 flex items-center justify-between">
          <Button variant="ghost" size="sm" disabled={index === 0} onClick={() => void navigate(`/lesson/${lesson.id}/${index - 1}`)}>
            ← Previous
          </Button>
          <span className="text-xs text-ink-muted">Step {index + 1} of {lesson.steps.length}</span>
          {isLast ? (
            <Link to="/"><Button size="sm" variant="ghost">Back to dashboard</Button></Link>
          ) : (
            <Button size="sm" onClick={() => void navigate(`/lesson/${lesson.id}/${index + 1}`)}>Next →</Button>
          )}
        </footer>
      </section>
    </div>
  );
}
