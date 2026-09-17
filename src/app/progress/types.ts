export type Progress = {
  version: 1;
  steps: Record<string, { completedAt: string }>;
  code: Record<string, Record<string, string>>;
  quiz: Record<string, Record<string, string>>;
  lastVisited?: string;
};

export function emptyProgress(): Progress {
  return { version: 1, steps: {}, code: {}, quiz: {} };
}

function isStringRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

export function isProgress(x: unknown): x is Progress {
  if (!isStringRecord(x)) return false;
  if (x.version !== 1) return false;
  if (!isStringRecord(x.steps) || !isStringRecord(x.code) || !isStringRecord(x.quiz)) return false;
  if (x.lastVisited !== undefined && typeof x.lastVisited !== 'string') return false;
  return true;
}
