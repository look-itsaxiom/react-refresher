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

// TODO: normalize component/prop/token names (lowercase, strip '-', '_', spaces) before matching
// across the two sides. Fill in missingInCode/missingInFigma, then for matched components report
// propMismatches ('missing-in-code', 'missing-in-figma', 'options-differ' for variant/enum props
// whose option sets differ case-insensitively). Fill in tokenDrift for matched tokens whose
// normalized color values (lowercase, 3-digit hex expanded to 6) differ.
export function detectDesignDrift(figma: FigmaData, code: CodeData): DriftReport {
  return { missingInCode: [], missingInFigma: [], propMismatches: [], tokenDrift: [] };
}

export type ComponentReadiness = {
  hasStoryForEachVariant: boolean;
  a11yChecked: boolean;
  visualBaseline: boolean;
  figmaLinked: boolean;
  docsDescription: boolean;
};

// TODO: return, in this fixed order, the human-readable label for every false flag, and
// ready: true only when nothing is missing.
export function handoffChecklist(component: ComponentReadiness): { missing: string[]; ready: boolean } {
  return { missing: [], ready: false };
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
