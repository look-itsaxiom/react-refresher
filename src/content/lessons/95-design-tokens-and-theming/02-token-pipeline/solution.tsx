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

function isToken(node: DtcgTree | DtcgToken): node is DtcgToken {
  return typeof node === 'object' && node !== null && '$value' in node;
}

function isAlias(value: unknown): value is string {
  return typeof value === 'string' && /^\{[^{}]+\}$/.test(value);
}

function aliasPath(value: string): string[] {
  return value.slice(1, -1).split('.');
}

function isDimension(value: unknown): value is DtcgDimension {
  return typeof value === 'object' && value !== null && 'value' in value && 'unit' in value;
}

function formatDimension(dim: DtcgDimension): string {
  return `${dim.value}${dim.unit}`;
}

function toKebab(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function varName(path: string[], prefix?: string): string {
  const parts = prefix ? [prefix, ...path] : path;
  return `--${parts.join('-')}`;
}

/** Flatten a tree into a map from dotted path -> token. */
function flatten(tree: DtcgTree, base: string[] = [], out = new Map<string, DtcgToken>()): Map<string, DtcgToken> {
  for (const key of Object.keys(tree)) {
    const node = tree[key];
    if (node === undefined) continue;
    const path = [...base, key];
    if (isToken(node)) {
      out.set(path.join('.'), node);
    } else {
      flatten(node, path, out);
    }
  }
  return out;
}

const TYPOGRAPHY_SUBKEYS: (keyof DtcgTypography)[] = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
];

function typographySubValue(value: DtcgTypography[keyof DtcgTypography]): string {
  if (isDimension(value)) return formatDimension(value);
  return String(value);
}

/** Resolve an alias chain to its concrete (non-alias) token, throwing on cycles or dangling refs. */
function resolveAliasToken(
  path: string,
  byPath: Map<string, DtcgToken>,
  visiting: Set<string> = new Set(),
): DtcgToken {
  if (visiting.has(path)) {
    throw new Error(`Alias cycle detected at "${path}"`);
  }
  const token = byPath.get(path);
  if (!token) {
    throw new Error(`Unknown alias target "${path}"`);
  }
  if (isAlias(token.$value)) {
    visiting.add(path);
    const next = aliasPath(token.$value).join('.');
    return resolveAliasToken(next, byPath, visiting);
  }
  return token;
}

/** CSS-side value for a simple (non-composite) token: alias stays a var() reference. */
function cssValueForSimple(token: DtcgToken, byPath: Map<string, DtcgToken>, prefix: string | undefined): string {
  if (isAlias(token.$value)) {
    const targetPath = aliasPath(token.$value);
    // Walk the chain purely to detect cycles / dangling refs; the CSS output stays a var() ref
    // to the *immediate* alias target so a theme overriding a primitive still cascades.
    resolveAliasToken(targetPath.join('.'), byPath, new Set());
    return `var(${varName(targetPath, prefix)})`;
  }
  if (isDimension(token.$value)) return formatDimension(token.$value);
  return String(token.$value);
}

function emitTokenCss(
  path: string[],
  token: DtcgToken,
  byPath: Map<string, DtcgToken>,
  prefix: string | undefined,
  lines: string[],
): void {
  if (token.$type === 'typography' && typeof token.$value === 'object' && !isDimension(token.$value)) {
    const typography = token.$value as DtcgTypography;
    for (const sub of TYPOGRAPHY_SUBKEYS) {
      const subValue = typography[sub];
      if (subValue === undefined) continue;
      const name = `${varName(path, prefix)}-${toKebab(sub)}`;
      lines.push(`  ${name}: ${typographySubValue(subValue)};`);
    }
    return;
  }
  lines.push(`  ${varName(path, prefix)}: ${cssValueForSimple(token, byPath, prefix)};`);
}

function emitBlock(
  selector: string,
  tree: DtcgTree,
  byPathForAliases: Map<string, DtcgToken>,
  prefix: string | undefined,
): string {
  const flat = flatten(tree);
  const lines: string[] = [];
  for (const [pathStr, token] of flat) {
    emitTokenCss(pathStr.split('.'), token, byPathForAliases, prefix, lines);
  }
  return `${selector} {\n${lines.join('\n')}\n}`;
}

function resolvedLiteral(token: DtcgToken, byPath: Map<string, DtcgToken>): DtcgToken['$value'] {
  if (isAlias(token.$value)) {
    const resolved = resolveAliasToken(aliasPath(token.$value).join('.'), byPath, new Set());
    return resolved.$value;
  }
  return token.$value;
}

function emitTsEntries(
  path: string[],
  token: DtcgToken,
  byPath: Map<string, DtcgToken>,
  prefix: string | undefined,
  entries: string[],
): void {
  const literal = resolvedLiteral(token, byPath);
  const resolvedType = isAlias(token.$value) ? resolveAliasToken(aliasPath(token.$value).join('.'), byPath).$type : token.$type;

  if (resolvedType === 'typography' && typeof literal === 'object' && !isDimension(literal)) {
    const typography = literal as DtcgTypography;
    for (const sub of TYPOGRAPHY_SUBKEYS) {
      const subValue = typography[sub];
      if (subValue === undefined) continue;
      const name = `${varName(path, prefix)}-${toKebab(sub)}`;
      entries.push(`  ${JSON.stringify(name)}: ${JSON.stringify(typographySubValue(subValue))}`);
    }
    return;
  }
  const value = isDimension(literal) ? formatDimension(literal) : String(literal);
  entries.push(`  ${JSON.stringify(varName(path, prefix))}: ${JSON.stringify(value)}`);
}

export function buildTokens(dtcg: DtcgTree, options: BuildTokensOptions = {}): BuildTokensResult {
  const { prefix, themes = {} } = options;
  const baseFlat = flatten(dtcg);

  const blocks = [emitBlock(':root', dtcg, baseFlat, prefix)];
  for (const [name, overrideTree] of Object.entries(themes)) {
    // Aliases inside a theme override may point at base-tree primitives, so resolve
    // against the full base map merged with this theme's own tokens.
    const mergedForAliasLookup = new Map(baseFlat);
    for (const [k, v] of flatten(overrideTree)) mergedForAliasLookup.set(k, v);
    blocks.push(emitBlock(`[data-theme="${name}"]`, overrideTree, mergedForAliasLookup, prefix));
  }

  return {
    css: blocks.join('\n\n'),
    toTs(): string {
      const entries: string[] = [];
      for (const [pathStr, token] of baseFlat) {
        emitTsEntries(pathStr.split('.'), token, baseFlat, prefix, entries);
      }
      return `export const tokens = {\n${entries.join(',\n')}\n} as const;\n`;
    },
  };
}

export function lintTokens(tree: DtcgTree): LintIssue[] {
  const issues: LintIssue[] = [];

  function walk(node: DtcgTree | DtcgToken, path: string[]): void {
    if (isToken(node)) {
      const pathStr = path.join('.');
      if (!node.$type) {
        issues.push({ path: pathStr, rule: 'missing-type', message: `"${pathStr}" is missing $type` });
      }
      if (path[0] === 'semantic' && !isAlias(node.$value)) {
        issues.push({
          path: pathStr,
          rule: 'raw-value-in-semantic',
          message: `"${pathStr}" is a semantic token with a raw value; alias a primitive instead`,
        });
      }
      return;
    }
    for (const key of Object.keys(node)) {
      const child = node[key];
      if (child !== undefined) walk(child, [...path, key]);
    }
  }

  walk(tree, []);
  return issues;
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
