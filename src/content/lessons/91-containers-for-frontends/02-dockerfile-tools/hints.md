Build `generateDockerfile` as an array of lines you `join('\n')` at the end — it's much
easier to conditionally push a line (like `HEALTHCHECK`) than to string-template
everything at once. Handle the three stages as three separate blocks of pushes, in
order: `deps`, then `build`, then a `kind`-dependent `runner`.
---
For the `deps` stage: `pnpm` needs `corepack enable` before anything else, then copy
`package.json` + `pnpm-lock.yaml`, then the install `RUN`. `npm` just needs
`package.json` + `package-lock.json` copied, then `RUN npm ci`. Keep both variants
returning the *lockfile copy* before the *install run* — that ordering is what the
checks (and the linter you're about to write) care about.
---
For `lintDockerfile`, split the text into lines and walk them once, tracking a boolean
like `sawInstall`. If you hit a line matching `COPY . .` before `sawInstall` has flipped
true, that's finding #1. Flip `sawInstall` true as soon as you see a line that looks like
an install command (`npm ci`, `npm install`, `pnpm install`, `pnpm fetch`, ...).
---
For the rest of the findings in `lintDockerfile`, each one is an independent line check —
you don't need the single walk-through for these: find the line starting with `CMD ` and
check whether it starts with `CMD [`; check whether *any* line starts with `USER `; check
whether the text matches a `FROM ...:latest` pattern; check for a line that's exactly
`RUN npm install`; check for an `ENV` line whose name matches
`/SECRET|TOKEN|PASSWORD|API_KEY/i`. Return only the findings that actually fired.
