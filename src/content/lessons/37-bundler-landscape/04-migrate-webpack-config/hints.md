Handle the four `vite` fields first, independently of `notes` — each is an `if (webpack.X) { vite.Y = ... }` with no dependency on the others.
---
For `definePlugin`, don't just spread `webpack.definePlugin` onto `vite.define` — you have to build a *new* object where every value is run through `JSON.stringify(value)` first: `for (const [key, value] of Object.entries(webpack.definePlugin)) define[key] = JSON.stringify(value)`.
---
For the notes that depend on a single boolean-ish check (`entry`, `resolve.extensions`, `module.rules`, `usesRequireContext`), each is just `if (condition) notes.push('...')` — put whatever wording you like in the string, as long as it contains the required substring from prompt.md.
---
For the env var notes, loop `envVarsUsed` with a template string: `` `Rename ${name} to VITE_${name}...` `` — as long as `VITE_` and the name are adjacent in the string with nothing between them, the check will find it. Skip any name where `name.startsWith('VITE_')` is already true.
