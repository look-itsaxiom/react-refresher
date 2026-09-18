Start with `largestChunks`: it doesn't depend on the other three. `chunk.modules.reduce((sum, m) => sum + m.size, 0)` gives you one chunk's total; map every chunk to `{ name, size }`, `.sort((a, b) => b.size - a.size)`, then `.slice(0, topN)`.
---
For `sharedModules` and `totalGzipEstimate`, build one `Map<string, ...>` keyed by module id first, by looping `for (const chunk of stats.chunks) for (const mod of chunk.modules)`. You'll want this map (or one very like it) for `duplicatedPackages` too, so build it once and reuse it rather than re-looping the chunks three separate times.
---
For `sharedModules`: instead of storing just a boolean or count per module id, store a `Set<string>` of chunk *names* that contain it — `chunksByModuleId.get(id).add(chunk.name)`. A module id whose set size is greater than 1 is shared. Using a `Set` (not a plain counter) matters if a module could ever legitimately appear twice in the *same* chunk's list — the set naturally ignores that.
---
For `duplicatedPackages`: iterate the *keys* of the map you already built (every distinct module id), run `id.match(PACKAGE_ID_RE)`, and skip ids where the match is `null`. On a match, `match[1]` is the package name and `match[2]` is the version — add the version to a `Map<string, Set<string>>` keyed by package name. At the end, keep only entries whose version `Set` has `.size > 1`, and spread each `Set` into an array for the result.
---
For `totalGzipEstimate`: build a `Map<string, number>` from module id to `gzipSize` by looping every chunk's modules and just assigning `map.set(mod.id, mod.gzipSize)` — writing the same id twice with the same value is harmless and is exactly the deduplication you want. Sum `[...map.values()]` at the end.
