import type { ExerciseStep as ExerciseStepData } from '../../content/types';
export function ExerciseStep({ step }: { step: ExerciseStepData; lessonId: string }) {
  return <p className="p-6">Exercise "{step.title}" UI arrives in Task 10.</p>;
}
