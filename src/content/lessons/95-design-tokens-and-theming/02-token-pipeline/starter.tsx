export type DtcgDimension = { value: number; unit: string };
export type DtcgTypography = {
  fontFamily?: string;
  fontSize?: DtcgDimension | string | number;
  fontWeight?: number;
  lineHeight?: number | string;
  letterSpacing?: DtcgDimension | string | number;
};

export type DtcgToken = {
  $value: string | number | DtcgDimension | DtcgTypography;
  $type?: string;
  $description?: string;
  $extensions?: Record<string, unknown>;
};

export type DtcgTree = { [key: string]: DtcgTree | DtcgToken };

export type BuildTokensOptions = {
  prefix?: string;
  themes?: Record<string, DtcgTree>;
};

export type BuildTokensResult = {
  css: string;
  toTs(): string;
};

export type LintIssue = {
  path: string;
  rule: 'raw-value-in-semantic' | 'missing-type';
  message: string;
};

// TODO: implement.
//
// - Flatten `dtcg` into CSS custom properties, joining the path with `-` and prefixing
//   with `options.prefix` if given.
// - An alias `$value` like "{color.brand.500}" must stay a `var(--...)` reference in the
//   CSS output (not a copied literal) — but resolve the chain enough to throw on a cycle
//   or a dangling reference.
// - `dimension` values ({ value, unit }) format as `${value}${unit}`.
// - `typography` values emit one custom property per present sub-key
//   (`--your-var-font-size`, `--your-var-font-weight`, ...).
// - Emit `:root { ... }` for the base tree, then `[data-theme="name"] { ... }` for each
//   entry in `options.themes`, containing only that theme's overridden tokens.
// - `toTs()` returns TS source where aliases are fully resolved to literal values.
export function buildTokens(dtcg: DtcgTree, options: BuildTokensOptions = {}): BuildTokensResult {
  void dtcg;
  void options;
  return {
    css: '',
    toTs(): string {
      return 'export const tokens = {} as const;\n';
    },
  };
}

// TODO: implement.
//
// - Flag any token missing `$type` with rule 'missing-type'.
// - Flag a token whose path starts with "semantic" and whose `$value` is not an alias
//   (doesn't match "{...}") with rule 'raw-value-in-semantic'.
export function lintTokens(tree: DtcgTree): LintIssue[] {
  void tree;
  return [];
}

const exampleTree: DtcgTree = {
  color: {
    brand: { 500: { $value: '#3b82f6', $type: 'color' } },
    neutral: { 900: { $value: '#0f1115', $type: 'color' } },
  },
  semantic: {
    color: {
      bg: { $value: '{color.neutral.900}', $type: 'color' },
      accent: { $value: '{color.brand.500}', $type: 'color' },
    },
  },
};

const example = buildTokens(exampleTree, {
  prefix: 'tc',
  themes: { light: { semantic: { color: { bg: { $value: '#ffffff', $type: 'color' } } } } },
});

export default function App() {
  return (
    <div>
      <h2>Generated CSS</h2>
      <pre data-testid="css-output" style={{ whiteSpace: 'pre-wrap' }}>
        {example.css}
      </pre>
      <h2>Generated TypeScript</h2>
      <pre data-testid="ts-output" style={{ whiteSpace: 'pre-wrap' }}>
        {example.toTs()}
      </pre>
      <p>Lint issues: {lintTokens(exampleTree).length}</p>
    </div>
  );
}
