export type ImportMap = {
  imports?: Record<string, string | null>;
  scopes?: Record<string, Record<string, string | null>>;
};

function isUrlLikeSpecifier(specifier: string): boolean {
  if (specifier.startsWith('/') || specifier.startsWith('./') || specifier.startsWith('../')) {
    return true;
  }
  try {
    new URL(specifier);
    return true;
  } catch {
    return false;
  }
}

/** Looks up `specifier` in one map (a scope's map, or the top-level `imports` map).
 * Returns the resolved string, `null` if the matched entry is explicitly blocked, or
 * `undefined` if nothing in this map matches at all. */
function lookupInMap(specifier: string, map: Record<string, string | null> | undefined): string | null | undefined {
  if (!map) return undefined;
  if (specifier in map) {
    return map[specifier];
  }
  let bestKey: string | undefined;
  for (const key of Object.keys(map)) {
    if (key.endsWith('/') && specifier.startsWith(key)) {
      if (bestKey === undefined || key.length > bestKey.length) {
        bestKey = key;
      }
    }
  }
  if (bestKey === undefined) return undefined;
  const value = map[bestKey];
  return value === null ? null : value + specifier.slice(bestKey.length);
}

export function resolveSpecifier(specifier: string, importMap: ImportMap, referrerUrl: string): string {
  if (isUrlLikeSpecifier(specifier)) {
    return new URL(specifier, referrerUrl).toString();
  }

  let matchedScopeKey: string | undefined;
  for (const scopeKey of Object.keys(importMap.scopes ?? {})) {
    if (referrerUrl.startsWith(scopeKey)) {
      if (matchedScopeKey === undefined || scopeKey.length > matchedScopeKey.length) {
        matchedScopeKey = scopeKey;
      }
    }
  }

  if (matchedScopeKey !== undefined) {
    const scoped = lookupInMap(specifier, importMap.scopes![matchedScopeKey]);
    if (scoped === null) {
      throw new Error(`Specifier "${specifier}" is blocked by scope "${matchedScopeKey}"`);
    }
    if (scoped !== undefined) {
      return scoped;
    }
  }

  const top = lookupInMap(specifier, importMap.imports);
  if (top === null) {
    throw new Error(`Specifier "${specifier}" is blocked by the top-level import map`);
  }
  if (top !== undefined) {
    return top;
  }

  throw new Error(`Unmapped bare specifier: "${specifier}"`);
}

const sampleMap: ImportMap = {
  imports: {
    'lodash-es': 'https://esm.sh/lodash-es@4.17.21',
    'app/': '/src/',
  },
  scopes: {
    'https://example.com/vendor/': {
      'lodash-es': 'https://esm.sh/lodash-es@3.10.1',
    },
    'https://example.com/vendor/legacy/': {
      'moment': null,
    },
  },
};

const samples: Array<{ specifier: string; referrer: string }> = [
  { specifier: 'lodash-es', referrer: 'https://example.com/src/main.js' },
  { specifier: 'lodash-es', referrer: 'https://example.com/vendor/widget.js' },
  { specifier: 'app/utils/format.js', referrer: 'https://example.com/src/main.js' },
  { specifier: './helpers.js', referrer: 'https://example.com/src/main.js' },
  { specifier: 'moment', referrer: 'https://example.com/vendor/legacy/old.js' },
  { specifier: 'unmapped-package', referrer: 'https://example.com/src/main.js' },
];

export default function App() {
  return (
    <table>
      <thead>
        <tr>
          <th>specifier</th>
          <th>referrer</th>
          <th>result</th>
        </tr>
      </thead>
      <tbody>
        {samples.map(({ specifier, referrer }) => {
          let result: string;
          try {
            result = resolveSpecifier(specifier, sampleMap, referrer);
          } catch (err) {
            result = `error: ${(err as Error).message}`;
          }
          return (
            <tr key={`${specifier}::${referrer}`}>
              <td>{specifier}</td>
              <td>{referrer}</td>
              <td>{result}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
