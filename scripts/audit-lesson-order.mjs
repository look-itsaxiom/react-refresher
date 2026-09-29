// Usage: node scripts/audit-lesson-order.mjs
// Lists exercises that use a React API no earlier concept step in the SAME lesson mentions.
// Signal for the React path (lessons 01 to 24); later lessons legitimately assume those APIs.
// For every lesson: for each exercise, find React/JS APIs the prompt+solution require that no earlier
// concept step in the same lesson mentions. Heuristic, but it catches "taught after used".
import fs from 'node:fs';
import path from 'node:path';
const root = 'src/content/lessons';
const apis = ['createContext','useContext','use(','useActionState','useOptimistic','useTransition','useDeferredValue','useSyncExternalStore','useEffectEvent','useImperativeHandle','useReducer','useRef','useMemo','useCallback','useId','forwardRef','Suspense','startTransition','flushSync','createPortal','lazy(','memo(','useLayoutEffect','<Activity','ViewTransition','useFormStatus','renderToString','hydrateRoot','createRoot'];
const hits = [];
for (const lesson of fs.readdirSync(root)) {
  const dir = path.join(root, lesson);
  const lessonTs = path.join(dir, 'lesson.ts');
  if (!fs.existsSync(lessonTs)) continue;
  const src = fs.readFileSync(lessonTs, 'utf8');
  // Recover step order from the imports order of ?raw files as they appear in the steps array.
  const stepsStart = src.indexOf('steps:');
  const body = src.slice(stepsStart);
  const items = [...body.matchAll(/kind: '(concept|exercise)'[^}]*?(markdown: (\w+)|prompt(?:: (\w+))?)/g)];
  const imports = Object.fromEntries([...src.matchAll(/import (\w+) from '\.\/([^']+)\?raw'/g)].map(m => [m[1], m[2]]));
  let taught = '';
  for (const it of items) {
    if (it[1] === 'concept') { const f = imports[it[3]]; if (f) taught += fs.readFileSync(path.join(dir, f), 'utf8') + '\n'; continue; }
    // exercise: find its folder via the prompt import name or by the step id
    const promptVar = it[4] || 'prompt';
    const promptFile = imports[promptVar];
    const exDir = promptFile ? path.dirname(promptFile) : null;
    if (!exDir) continue;
    const solPath = path.join(dir, exDir, 'solution.tsx'); if (!fs.existsSync(solPath)) continue; const need = fs.readFileSync(path.join(dir, exDir, 'prompt.md'), 'utf8') + fs.readFileSync(solPath, 'utf8');
    const missing = apis.filter(a => need.includes(a) && !taught.includes(a));
    if (missing.length) hits.push(`${lesson}/${exDir}: uses ${missing.join(', ')} before any earlier concept mentions it`);
  }
}
console.log(hits.length ? hits.join('\n') : 'no ordering problems found');
