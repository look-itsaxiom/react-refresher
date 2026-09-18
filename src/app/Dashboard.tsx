import { useRef } from 'react';
import { Link } from 'react-router';
import { getCurriculumView, getLessons } from '../content/registry';
import type { Lesson, LessonView } from '../content/types';
import { progressStore, useProgress, useSaveState } from './progress/useProgress';
import { isProgress, type Progress } from './progress/types';
import { firstIncompleteStepIndex, lessonCompletion, lessonStatus, overallCompletion, type LessonStatus } from './dashboard-status';
import { Button } from './components/Button';

type CardStatus = LessonStatus | 'locked';

function StatusPill({ status }: { status: CardStatus }) {
  const styles = {
    done: 'bg-success/15 text-success',
    'in-progress': 'bg-warning/15 text-warning',
    available: 'bg-accent/15 text-accent',
    locked: 'bg-surface-3 text-ink-muted',
  }[status];
  const label = { done: 'Done', 'in-progress': 'In progress', available: 'Start', locked: 'Coming soon' }[status];
  return <span className={`text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full ${styles}`}>{label}</span>;
}

function LessonCard({ view, progress }: { view: LessonView; progress: Progress }) {
  const { planned, lesson } = view;
  if (!lesson) {
    return (
      <div className="rounded-lg border border-border bg-surface-2 p-4 opacity-70">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-medium">{planned.title}</h3>
          <StatusPill status="locked" />
        </div>
        <p className="mt-1 text-sm text-ink-muted">{planned.summary}</p>
      </div>
    );
  }
  const status = lessonStatus(lesson, progress);
  const { done, total } = lessonCompletion(lesson, progress);
  const target = `/lesson/${lesson.id}/${firstIncompleteStepIndex(lesson, progress)}`;
  return (
    <Link to={target} className="block rounded-lg border border-border bg-surface-2 p-4 hover:border-accent transition-colors">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium">{lesson.title}</h3>
        <StatusPill status={status} />
      </div>
      <p className="mt-1 text-sm text-ink-muted">{lesson.summary}</p>
      <div className="mt-3 h-1.5 rounded bg-surface-3 overflow-hidden">
        <div className="h-full bg-accent" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
      </div>
      <p className="mt-1 text-xs text-ink-muted">{done}/{total} steps</p>
    </Link>
  );
}

function ContinueButton({ lessons, progress }: { lessons: Lesson[]; progress: Progress }) {
  const target = progress.lastVisited ?? (lessons[0] ? `/lesson/${lessons[0].id}/0` : null);
  if (!target) return null;
  return (
    <Link to={target}>
      <Button>Continue where you left off</Button>
    </Link>
  );
}

function ExportImport() {
  const fileInput = useRef<HTMLInputElement>(null);
  const saveState = useSaveState();

  function exportJson() {
    const blob = new Blob([JSON.stringify(progressStore.getSnapshot(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `react-refresher-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importJson(file: File) {
    let data: unknown;
    try {
      data = JSON.parse(await file.text());
    } catch {
      window.alert('That file is not a valid progress export.');
      return;
    }
    if (!isProgress(data)) {
      window.alert('That file is not a valid progress export.');
      return;
    }
    progressStore.replace(data);
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="ghost" onClick={exportJson} disabled={saveState === 'loading'}>Export progress</Button>
      <Button size="sm" variant="ghost" onClick={() => fileInput.current?.click()}>Import progress</Button>
      <input
        ref={fileInput}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void importJson(f); e.target.value = ''; }}
      />
    </div>
  );
}

export function Dashboard() {
  const progress = useProgress();
  const lessons = getLessons();
  const overall = overallCompletion(lessons, progress);
  const view = getCurriculumView();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-10">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Your React path</h1>
          <p className="mt-1 text-ink-muted">
            {overall.done} of {overall.total} steps complete across {lessons.length} playable lessons ({overall.percent}%).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ExportImport />
          <ContinueButton lessons={lessons} progress={progress} />
        </div>
      </section>

      {view.map(({ track, lessons: items }) => (
        <section key={track.id}>
          <h2 className="text-lg font-semibold">{track.title}</h2>
          <p className="text-sm text-ink-muted mb-3">{track.description}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => <LessonCard key={item.planned.id} view={item} progress={progress} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
