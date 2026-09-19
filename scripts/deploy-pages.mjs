// Build the static site for GitHub Pages and push it to the `gh-pages` branch.
//
//   pnpm deploy:pages
//
// The Pages build uses `base: '/react-refresher/'` (GITHUB_PAGES=1 in vite.config.ts). A copy of
// index.html is written as 404.html so deep links (e.g. /react-refresher/lesson/05-…/2) still load
// the SPA, and `.nojekyll` stops Pages from ignoring files that start with an underscore.
// Local-only features (the file-backed progress store and the `go test` runner) are not available
// on Pages; the app falls back to localStorage and manual completion for those.
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const remote = process.env.PAGES_REMOTE ?? execSync('git remote get-url origin', { cwd: root, encoding: 'utf8' }).trim();
const branch = process.env.PAGES_BRANCH ?? 'gh-pages';

function run(cmd, cwd) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, GITHUB_PAGES: '1' } });
}

run('pnpm vite build', root);
if (!existsSync(join(dist, 'index.html'))) throw new Error('build produced no dist/index.html');
cpSync(join(dist, 'index.html'), join(dist, '404.html'));
writeFileSync(join(dist, '.nojekyll'), '');

// Publish from a throwaway clone so the working tree and its history are untouched.
const stage = mkdtempSync(join(tmpdir(), 'react-refresher-pages-'));
try {
  cpSync(dist, stage, { recursive: true });
  run('git init -q -b ' + branch, stage);
  run('git add -A', stage);
  run('git -c user.name="deploy-pages" -c user.email="deploy-pages@localhost" commit -q -m "deploy: ' + new Date().toISOString() + '"', stage);
  run(`git push --force "${remote}" HEAD:${branch}`, stage);
} finally {
  rmSync(stage, { recursive: true, force: true });
}
console.log(`\nPushed ${branch}. If Pages is enabled for that branch, the site updates in a minute or two.`);
