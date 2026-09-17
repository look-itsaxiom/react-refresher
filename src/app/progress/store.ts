import { emptyProgress, type Progress } from './types';

export type SaveState = 'idle' | 'loading' | 'saving' | 'saved' | 'error';

export type ProgressBackend = {
  load(): Promise<Progress>;
  save(progress: Progress): Promise<void>;
};

export type ProgressStore = {
  getSnapshot(): Progress;
  getSaveState(): SaveState;
  subscribe(listener: () => void): () => void;
  load(): Promise<void>;
  completeStep(key: string): void;
  uncompleteStep(key: string): void;
  saveCode(key: string, files: Record<string, string>): void;
  answerQuiz(key: string, questionId: string, choiceId: string): void;
  setLastVisited(path: string): void;
  replace(progress: Progress): void;
  retrySave(): void;
  flush(): Promise<void>;
};

export function createProgressStore(
  backend: ProgressBackend,
  opts: { debounceMs?: number; now?: () => string } = {},
): ProgressStore {
  const debounceMs = opts.debounceMs ?? 750;
  const now = opts.now ?? (() => new Date().toISOString());

  let progress: Progress = emptyProgress();
  let saveState: SaveState = 'loading';
  let timer: ReturnType<typeof setTimeout> | null = null;
  let dirty = false;
  const listeners = new Set<() => void>();

  function emit() {
    for (const l of listeners) l();
  }

  function setSaveState(next: SaveState) {
    if (saveState === next) return;
    saveState = next;
    emit();
  }

  async function persist(): Promise<void> {
    if (timer) { clearTimeout(timer); timer = null; }
    if (!dirty) return;
    dirty = false;
    setSaveState('saving');
    try {
      await backend.save(progress);
      if (!dirty) setSaveState('saved');
    } catch {
      dirty = true;
      setSaveState('error');
    }
  }

  function schedule() {
    dirty = true;
    setSaveState('saving');
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { void persist(); }, debounceMs);
  }

  function update(next: Progress) {
    progress = next;
    emit();
    schedule();
  }

  return {
    getSnapshot: () => progress,
    getSaveState: () => saveState,
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    async load() {
      setSaveState('loading');
      try {
        progress = await backend.load();
        setSaveState('idle');
      } catch {
        setSaveState('error');
      }
      emit();
    },
    completeStep(key) {
      if (progress.steps[key]) return;
      update({ ...progress, steps: { ...progress.steps, [key]: { completedAt: now() } } });
    },
    uncompleteStep(key) {
      if (!progress.steps[key]) return;
      const { [key]: _removed, ...rest } = progress.steps;
      update({ ...progress, steps: rest });
    },
    saveCode(key, files) {
      update({ ...progress, code: { ...progress.code, [key]: { ...files } } });
    },
    answerQuiz(key, questionId, choiceId) {
      const existing = progress.quiz[key] ?? {};
      if (existing[questionId] === choiceId) return;
      update({ ...progress, quiz: { ...progress.quiz, [key]: { ...existing, [questionId]: choiceId } } });
    },
    setLastVisited(path) {
      if (progress.lastVisited === path) return;
      update({ ...progress, lastVisited: path });
    },
    replace(next) {
      update(structuredClone(next));
    },
    retrySave() {
      dirty = true;
      void persist();
    },
    flush: () => persist(),
  };
}
