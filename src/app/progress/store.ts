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
  clearCode(key: string): void;
  answerQuiz(key: string, questionId: string, choiceId: string): void;
  clearQuiz(key: string): void;
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
  let inFlight: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  // Resolved by load() once it settles (success or failure), so persist() never saves
  // before the initial GET comes back and clobbers it with a near-empty shape. `isLoaded`
  // lets persist() skip the `await` entirely once loading has already settled, so saves
  // after that point are not delayed by an extra microtask tick.
  let isLoaded = false;
  let resolveLoaded: () => void = () => {};
  const loaded: Promise<void> = new Promise((resolve) => { resolveLoaded = resolve; });
  function markLoaded() { isLoaded = true; resolveLoaded(); }

  // Edits made while load() is in flight land on top of `emptyProgress()` (via `update()`,
  // which sets `progress` immediately); merge them onto the loaded snapshot (loaded data
  // first, local edits win per-key) instead of letting the loaded data overwrite them.
  function mergeLocalOntoLoaded(loadedData: Progress, local: Progress): Progress {
    return {
      ...loadedData,
      steps: { ...loadedData.steps, ...local.steps },
      code: { ...loadedData.code, ...local.code },
      quiz: { ...loadedData.quiz, ...local.quiz },
      lastVisited: local.lastVisited ?? loadedData.lastVisited,
    };
  }

  function emit() {
    for (const l of listeners) l();
  }

  function setSaveState(next: SaveState) {
    if (saveState === next) return;
    saveState = next;
    emit();
  }

  function persist(): Promise<void> {
    if (timer) { clearTimeout(timer); timer = null; }
    if (inFlight) return inFlight;
    if (!dirty) return Promise.resolve();
    inFlight = (async () => {
      if (!isLoaded) await loaded;
      while (dirty) {
        dirty = false;
        const snapshot = progress;
        setSaveState('saving');
        try {
          await backend.save(snapshot);
          if (!dirty) setSaveState('saved');
        } catch {
          dirty = true;
          setSaveState('error');
          break;
        }
      }
    })().finally(() => { inFlight = null; });
    return inFlight;
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
        const loadedData = await backend.load();
        // `progress` here reflects any local edits made while this await was pending.
        progress = mergeLocalOntoLoaded(loadedData, progress);
        setSaveState('idle');
      } catch {
        setSaveState('error');
      }
      emit();
      markLoaded();
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
    clearCode(key) {
      if (!progress.code[key]) return;
      const { [key]: _c, ...code } = progress.code;
      update({ ...progress, code });
    },
    answerQuiz(key, questionId, choiceId) {
      const existing = progress.quiz[key] ?? {};
      if (existing[questionId] === choiceId) return;
      update({ ...progress, quiz: { ...progress.quiz, [key]: { ...existing, [questionId]: choiceId } } });
    },
    clearQuiz(key) {
      const { [key]: _q, ...quiz } = progress.quiz;
      const { [key]: _s, ...steps } = progress.steps;
      update({ ...progress, quiz, steps });
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
