import { emptyProgress, isProgress, type Progress } from './types';
import type { ProgressBackend } from './store';

const ENDPOINT = '/__progress';
const LS_KEY = 'react-refresher.progress.v1';

export const httpBackend: ProgressBackend = {
  async load() {
    const res = await fetch(ENDPOINT);
    if (!res.ok) throw new Error(`GET ${ENDPOINT} failed: ${res.status}`);
    const data: unknown = await res.json();
    return isProgress(data) ? data : emptyProgress();
  },
  async save(progress) {
    const res = await fetch(ENDPOINT, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(progress),
    });
    if (!res.ok) throw new Error(`PUT ${ENDPOINT} failed: ${res.status}`);
  },
};

export const localStorageBackend: ProgressBackend = {
  async load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const data: unknown = raw ? JSON.parse(raw) : null;
      return isProgress(data) ? data : emptyProgress();
    } catch {
      return emptyProgress();
    }
  },
  async save(progress: Progress) {
    localStorage.setItem(LS_KEY, JSON.stringify(progress));
  },
};

/** Dev server has the file-backed endpoint; a static build falls back to localStorage. */
export function pickBackend(): ProgressBackend {
  return import.meta.env.DEV ? httpBackend : localStorageBackend;
}
