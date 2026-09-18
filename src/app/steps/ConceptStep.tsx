import type { ConceptStep as ConceptStepData } from '../../content/types';
import { Markdown } from '../components/Markdown';
import { Button } from '../components/Button';
import { stepKey } from '../../content/registry';
import { useStepDone, progressStore } from '../progress/useProgress';

export function ConceptStep({ step, lessonId }: { step: ConceptStepData; lessonId: string }) {
  const key = stepKey(lessonId, step.id);
  const done = useStepDone(key);
  return (
    <article className="mx-auto max-w-3xl px-6 py-8">
      <Markdown source={step.markdown} />
      <div className="mt-10 flex items-center gap-3 border-t border-border pt-6">
        {done ? (
          <span className="text-success text-sm">✓ Marked as read</span>
        ) : (
          <Button onClick={() => progressStore.completeStep(key)}>Mark as read</Button>
        )}
      </div>
    </article>
  );
}
