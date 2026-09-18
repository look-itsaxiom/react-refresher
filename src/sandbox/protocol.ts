import type { UserFiles } from './modules';

export const PREVIEW_PATH = '/preview.html';

export type CheckResult = {
  name: string;
  status: 'pass' | 'fail';
  error?: string;
  durationMs: number;
};

export type RunMode = 'preview' | 'checks';

export type ParentToFrame = {
  type: 'run';
  runId: number;
  exerciseKey: string; // `${lessonId}/${stepId}`, used by the iframe to find checks
  files: UserFiles;
  entry: string;
  mode: RunMode;
  runtime?: 'browser' | 'sql';
};

export type ConsoleLevel = 'log' | 'info' | 'warn' | 'error';

export type FrameToParent =
  | { type: 'ready' }
  | { type: 'preview-ok'; runId: number }
  | { type: 'compile-error'; runId: number; message: string; filename?: string; line?: number; column?: number }
  | { type: 'runtime-error'; runId: number; message: string }
  | { type: 'console'; level: ConsoleLevel; args: string[] }
  | { type: 'check-results'; runId: number; results: CheckResult[]; allPassed: boolean }
  | { type: 'sql-result'; runId: number; columns: string[]; rows: Record<string, unknown>[]; error: string | null; statements: number };

export function isFrameToParent(data: unknown): data is FrameToParent {
  return typeof data === 'object' && data !== null && 'type' in data && typeof (data as { type: unknown }).type === 'string';
}
