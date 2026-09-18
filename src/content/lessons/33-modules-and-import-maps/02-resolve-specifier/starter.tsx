export type ImportMap = {
  imports?: Record<string, string | null>;
  scopes?: Record<string, Record<string, string | null>>;
};

// TODO: implement per prompt.md.
export function resolveSpecifier(specifier: string, importMap: ImportMap, referrerUrl: string): string {
  throw new Error('not implemented');
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
