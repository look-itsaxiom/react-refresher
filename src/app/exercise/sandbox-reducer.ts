import type { CheckResult, ConsoleLevel, FrameToParent, RunMode } from '../../sandbox/protocol';

export type LogLine = { id: number; level: ConsoleLevel; text: string };

export type SandboxState = {
  ready: boolean;
  runId: number;
  mode: RunMode;
  phase: 'idle' | 'compiling' | 'checking' | 'ok' | 'compile-error' | 'runtime-error';
  results: CheckResult[] | null;
  allPassed: boolean | null;
  error: { message: string; filename?: string; line?: number } | null;
  logs: LogLine[];
  nextLogId: number;
  sql: { columns: string[]; rows: Record<string, unknown>[]; error: string | null; statements: number } | null;
};

export type SandboxAction =
  | { type: 'message'; msg: FrameToParent }
  | { type: 'start'; runId: number; mode: RunMode }
  | { type: 'clear-logs' };

export const initialSandboxState: SandboxState = {
  ready: false, runId: 0, mode: 'preview', phase: 'idle', results: null, allPassed: null, error: null, logs: [], nextLogId: 1, sql: null,
};

export function sandboxReducer(state: SandboxState, action: SandboxAction): SandboxState {
  switch (action.type) {
    case 'start':
      return { ...state, runId: action.runId, mode: action.mode, phase: action.mode === 'checks' ? 'checking' : 'compiling', error: null, logs: [], sql: null, ...(action.mode === 'checks' ? { results: null, allPassed: null } : {}) };
    case 'clear-logs':
      return { ...state, logs: [] };
    case 'message': {
      const { msg } = action;
      switch (msg.type) {
        case 'ready':
          return { ...state, ready: true };
        case 'console':
          return { ...state, logs: [...state.logs, { id: state.nextLogId, level: msg.level, text: msg.args.join(' ') }], nextLogId: state.nextLogId + 1 };
        case 'preview-ok':
          return msg.runId !== state.runId ? state : { ...state, phase: 'ok', error: null };
        case 'compile-error':
          return msg.runId !== state.runId ? state : { ...state, phase: 'compile-error', error: { message: msg.message, filename: msg.filename, line: msg.line } };
        case 'runtime-error':
          return msg.runId !== state.runId ? state : { ...state, phase: 'runtime-error', error: { message: msg.message } };
        case 'check-results':
          return msg.runId !== state.runId ? state : { ...state, phase: 'ok', results: msg.results, allPassed: msg.allPassed };
        case 'sql-result':
          if (msg.runId !== state.runId) return state;
          return {
            ...state,
            sql: { columns: msg.columns, rows: msg.rows, error: msg.error, statements: msg.statements },
            phase: msg.error ? 'runtime-error' : 'ok',
            error: msg.error ? { message: msg.error } : null,
          };
      }
    }
  }
}
