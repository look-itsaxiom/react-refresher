import { useSyncExternalStore } from 'react';
import { createProgressStore, type SaveState } from './store';
import { pickBackend } from './backends';
import type { Progress } from './types';

export const progressStore = createProgressStore(pickBackend());

export function useProgress(): Progress {
  return useSyncExternalStore(progressStore.subscribe, progressStore.getSnapshot, progressStore.getSnapshot);
}

export function useSaveState(): SaveState {
  return useSyncExternalStore(progressStore.subscribe, progressStore.getSaveState, progressStore.getSaveState);
}

export function useStepDone(key: string): boolean {
  return useProgress().steps[key] !== undefined;
}
