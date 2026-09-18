export type FigmaProperty = { type: 'boolean' | 'variant' | 'text'; options?: string[] };
export type FigmaComponent = { name: string; properties: Record<string, FigmaProperty> };
export type FigmaData = { components: FigmaComponent[]; variables: Record<string, string> };

export type CodeProp = { type: 'boolean' | 'enum' | 'string'; options?: string[] };
export type CodeComponent = { name: string; props: Record<string, CodeProp> };
export type CodeData = { components: CodeComponent[]; tokens: Record<string, string> };

export type PropMismatch = {
  component: string;
  prop: string;
  kind: 'missing-in-code' | 'missing-in-figma' | 'options-differ';
  detail: string;
};
export type TokenDrift = { token: string; figma: string; code: string };

export type DriftReport = {
  missingInCode: string[];
  missingInFigma: string[];
  propMismatches: PropMismatch[];
  tokenDrift: TokenDrift[];
};

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[-_\s]+/g, '');
}

function normalizeColor(value: string): string {
  const v = value.trim().toLowerCase();
  const shortHex = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(v);
  if (shortHex) {
    return `#${shortHex[1]}${shortHex[1]}${shortHex[2]}${shortHex[2]}${shortHex[3]}${shortHex[3]}`;
  }
  return v;
}

function optionsEqual(a: string[] = [], b: string[] = []): boolean {
  const setA = new Set(a.map((o) => o.toLowerCase()));
  const setB = new Set(b.map((o) => o.toLowerCase()));
  if (setA.size !== setB.size) return false;
  for (const option of setA) if (!setB.has(option)) return false;
  return true;
}

export function detectDesignDrift(figma: FigmaData, code: CodeData): DriftReport {
  const missingInCode: string[] = [];
  const missingInFigma: string[] = [];
  const propMismatches: PropMismatch[] = [];
  const tokenDrift: TokenDrift[] = [];

  const codeByNorm = new Map(code.components.map((c) => [normalizeName(c.name), c]));
  const figmaByNorm = new Map(figma.components.map((c) => [normalizeName(c.name), c]));

  for (const figmaComponent of figma.components) {
    const codeMatch = codeByNorm.get(normalizeName(figmaComponent.name));
    if (!codeMatch) {
      missingInCode.push(figmaComponent.name);
      continue;
    }

    const figmaProps = Object.entries(figmaComponent.properties).map(([key, prop]) => ({
      normKey: normalizeName(key),
      key,
      prop,
    }));
    const codeProps = Object.entries(codeMatch.props).map(([key, prop]) => ({
      normKey: normalizeName(key),
      key,
      prop,
    }));
    const codePropsByNorm = new Map(codeProps.map((entry) => [entry.normKey, entry]));
    const figmaPropsByNorm = new Map(figmaProps.map((entry) => [entry.normKey, entry]));

    for (const { normKey, key, prop } of figmaProps) {
      const codeEntry = codePropsByNorm.get(normKey);
      if (!codeEntry) {
        propMismatches.push({
          component: figmaComponent.name,
          prop: key,
          kind: 'missing-in-code',
          detail: `figma property "${key}" has no matching prop on code component "${codeMatch.name}"`,
        });
        continue;
      }
      const isChoiceType = prop.type === 'variant' && codeEntry.prop.type === 'enum';
      if (isChoiceType && !optionsEqual(prop.options, codeEntry.prop.options)) {
        propMismatches.push({
          component: figmaComponent.name,
          prop: key,
          kind: 'options-differ',
          detail: `figma options [${(prop.options ?? []).join(', ')}] vs code options [${(codeEntry.prop.options ?? []).join(', ')}]`,
        });
      }
    }

    for (const { normKey, key } of codeProps) {
      if (!figmaPropsByNorm.has(normKey)) {
        propMismatches.push({
          component: figmaComponent.name,
          prop: key,
          kind: 'missing-in-figma',
          detail: `code prop "${key}" on "${codeMatch.name}" has no matching property on figma component "${figmaComponent.name}"`,
        });
      }
    }
  }

  for (const codeComponent of code.components) {
    if (!figmaByNorm.has(normalizeName(codeComponent.name))) {
      missingInFigma.push(codeComponent.name);
    }
  }

  const codeTokensByNorm = new Map(Object.entries(code.tokens).map(([key, value]) => [normalizeName(key), { key, value }]));
  for (const [figmaKey, figmaValue] of Object.entries(figma.variables)) {
    const codeEntry = codeTokensByNorm.get(normalizeName(figmaKey));
    if (!codeEntry) continue;
    if (normalizeColor(figmaValue) !== normalizeColor(codeEntry.value)) {
      tokenDrift.push({ token: figmaKey, figma: figmaValue, code: codeEntry.value });
    }
  }

  return { missingInCode, missingInFigma, propMismatches, tokenDrift };
}

export type ComponentReadiness = {
  hasStoryForEachVariant: boolean;
  a11yChecked: boolean;
  visualBaseline: boolean;
  figmaLinked: boolean;
  docsDescription: boolean;
};

const CHECKLIST_ORDER: Array<[keyof ComponentReadiness, string]> = [
  ['hasStoryForEachVariant', 'a story for every variant'],
  ['a11yChecked', 'a11y addon checked with no violations'],
  ['visualBaseline', 'a visual regression baseline approved'],
  ['figmaLinked', 'linked to its Figma component (Code Connect)'],
  ['docsDescription', 'a docs description for the component'],
];

export function handoffChecklist(component: ComponentReadiness): { missing: string[]; ready: boolean } {
  const missing = CHECKLIST_ORDER.filter(([key]) => !component[key]).map(([, label]) => label);
  return { missing, ready: missing.length === 0 };
}

const figma: FigmaData = {
  components: [
    { name: 'primary-button', properties: { variant: { type: 'variant', options: ['Primary', 'Secondary'] } } },
  ],
  variables: { 'color-brand': '#3366ff' },
};

const code: CodeData = {
  components: [{ name: 'primaryButton', props: { variant: { type: 'enum', options: ['primary', 'secondary'] } } }],
  tokens: { colorBrand: '#3366ff' },
};

const report = detectDesignDrift(figma, code);
const checklist = handoffChecklist({
  hasStoryForEachVariant: true,
  a11yChecked: false,
  visualBaseline: false,
  figmaLinked: true,
  docsDescription: false,
});

export default function App() {
  return (
    <div style={{ padding: 16, fontFamily: 'monospace' }}>
      <p>drift report: {JSON.stringify(report)}</p>
      <p>checklist missing: {checklist.missing.join(', ') || 'none'}</p>
    </div>
  );
}
