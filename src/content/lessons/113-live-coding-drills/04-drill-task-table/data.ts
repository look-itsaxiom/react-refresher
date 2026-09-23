export type Status = 'todo' | 'in-progress' | 'done';
export type TaskRow = { id: number; title: string; status: Status; dueDate: string };

const STATUSES: Status[] = ['todo', 'in-progress', 'done'];
const WORDS = ['Antenna', 'Battery', 'Bracket', 'Calibration', 'Chassis', 'Enclosure', 'Firmware', 'Harness', 'Sensor', 'Wiring'];

/** Deterministic fixture: same 5,000 rows every run, generated once at module load. */
export const rows: TaskRow[] = Array.from({ length: 5000 }, (_, i) => {
  const word = WORDS[i % WORDS.length]!;
  const status = STATUSES[i % STATUSES.length]!;
  const month = String((i % 12) + 1).padStart(2, '0');
  const day = String((i % 28) + 1).padStart(2, '0');
  return {
    id: i + 1,
    title: `${word} task ${i + 1}`,
    status,
    dueDate: `2026-${month}-${day}`,
  };
});
