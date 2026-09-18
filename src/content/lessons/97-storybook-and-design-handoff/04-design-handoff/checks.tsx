import type { Check } from '../../../types';

type FigmaProperty = { type: 'boolean' | 'variant' | 'text'; options?: string[] };
type FigmaComponent = { name: string; properties: Record<string, FigmaProperty> };
type FigmaData = { components: FigmaComponent[]; variables: Record<string, string> };
type CodeProp = { type: 'boolean' | 'enum' | 'string'; options?: string[] };
type CodeComponent = { name: string; props: Record<string, CodeProp> };
type CodeData = { components: CodeComponent[]; tokens: Record<string, string> };
type PropMismatch = {
  component: string;
  prop: string;
  kind: 'missing-in-code' | 'missing-in-figma' | 'options-differ';
  detail: string;
};
type TokenDrift = { token: string; figma: string; code: string };
type DriftReport = {
  missingInCode: string[];
  missingInFigma: string[];
  propMismatches: PropMismatch[];
  tokenDrift: TokenDrift[];
};
type ComponentReadiness = {
  hasStoryForEachVariant: boolean;
  a11yChecked: boolean;
  visualBaseline: boolean;
  figmaLinked: boolean;
  docsDescription: boolean;
};
type Mod = {
  detectDesignDrift: (figma: FigmaData, code: CodeData) => DriftReport;
  handoffChecklist: (component: ComponentReadiness) => { missing: string[]; ready: boolean };
};

export const checks: Check[] = [
  {
    name: 'matches component and prop names across kebab-case and camelCase before comparing',
    run: async ({ mod }) => {
      const { detectDesignDrift } = mod as unknown as Mod;
      const figma: FigmaData = {
        components: [{ name: 'primary-button', properties: { 'icon-position': { type: 'text' } } }],
        variables: {},
      };
      const code: CodeData = {
        components: [{ name: 'primaryButton', props: { iconPosition: { type: 'string' } } }],
        tokens: {},
      };
      const report = detectDesignDrift(figma, code);
      if (report.missingInCode.length !== 0) throw new Error(`expected no missing-in-code components, got ${JSON.stringify(report.missingInCode)}`);
      if (report.missingInFigma.length !== 0) throw new Error(`expected no missing-in-figma components, got ${JSON.stringify(report.missingInFigma)}`);
      if (report.propMismatches.length !== 0) throw new Error(`expected no prop mismatches once names are normalized, got ${JSON.stringify(report.propMismatches)}`);
    },
  },
  {
    name: 'reports missing-in-code and missing-in-figma components that truly have no counterpart',
    run: async ({ mod }) => {
      const { detectDesignDrift } = mod as unknown as Mod;
      const figma: FigmaData = { components: [{ name: 'Tooltip', properties: {} }], variables: {} };
      const code: CodeData = { components: [{ name: 'Modal', props: {} }], tokens: {} };
      const report = detectDesignDrift(figma, code);
      if (!report.missingInCode.includes('Tooltip')) throw new Error(`expected 'Tooltip' in missingInCode, got ${JSON.stringify(report.missingInCode)}`);
      if (!report.missingInFigma.includes('Modal')) throw new Error(`expected 'Modal' in missingInFigma, got ${JSON.stringify(report.missingInFigma)}`);
    },
  },
  {
    name: 'reports missing-in-code and missing-in-figma props for matched components',
    run: async ({ mod }) => {
      const { detectDesignDrift } = mod as unknown as Mod;
      const figma: FigmaData = {
        components: [{ name: 'Card', properties: { elevated: { type: 'boolean' }, title: { type: 'text' } } }],
        variables: {},
      };
      const code: CodeData = {
        components: [{ name: 'Card', props: { elevated: { type: 'boolean' }, dataTestId: { type: 'string' } } }],
        tokens: {},
      };
      const report = detectDesignDrift(figma, code);
      const missingInCode = report.propMismatches.find((m) => m.prop === 'title' && m.kind === 'missing-in-code');
      if (!missingInCode) throw new Error(`expected a missing-in-code mismatch for 'title', got ${JSON.stringify(report.propMismatches)}`);
      const missingInFigma = report.propMismatches.find((m) => m.prop === 'dataTestId' && m.kind === 'missing-in-figma');
      if (!missingInFigma) throw new Error(`expected a missing-in-figma mismatch for 'dataTestId', got ${JSON.stringify(report.propMismatches)}`);
      const falsePositive = report.propMismatches.find((m) => m.prop === 'elevated');
      if (falsePositive) throw new Error(`'elevated' matches on both sides and should not appear in propMismatches, got ${JSON.stringify(falsePositive)}`);
    },
  },
  {
    name: 'options-differ is case- and order-insensitive, and only fires for a genuine set difference',
    run: async ({ mod }) => {
      const { detectDesignDrift } = mod as unknown as Mod;
      const sameOptions: FigmaData = {
        components: [{ name: 'Badge', properties: { tone: { type: 'variant', options: ['Success', 'Warning'] } } }],
        variables: {},
      };
      const sameOptionsCode: CodeData = {
        components: [{ name: 'Badge', props: { tone: { type: 'enum', options: ['warning', 'success'] } } }],
        tokens: {},
      };
      const noDrift = detectDesignDrift(sameOptions, sameOptionsCode);
      const falsePositive = noDrift.propMismatches.find((m) => m.prop === 'tone');
      if (falsePositive) throw new Error(`options differing only in case/order should not be reported, got ${JSON.stringify(falsePositive)}`);

      const realDrift: FigmaData = {
        components: [{ name: 'Badge', properties: { tone: { type: 'variant', options: ['Success', 'Warning', 'Danger'] } } }],
        variables: {},
      };
      const withDrift = detectDesignDrift(realDrift, sameOptionsCode);
      const mismatch = withDrift.propMismatches.find((m) => m.prop === 'tone' && m.kind === 'options-differ');
      if (!mismatch) throw new Error(`expected an options-differ mismatch for 'tone', got ${JSON.stringify(withDrift.propMismatches)}`);
    },
  },
  {
    name: 'tokenDrift normalizes 3-digit hex to 6-digit and only flags a genuine value difference',
    run: async ({ mod }) => {
      const { detectDesignDrift } = mod as unknown as Mod;
      const noDriftFigma: FigmaData = { components: [], variables: { 'color-brand': '#FFF' } };
      const noDriftCode: CodeData = { components: [], tokens: { colorBrand: '#ffffff' } };
      const noDrift = detectDesignDrift(noDriftFigma, noDriftCode);
      if (noDrift.tokenDrift.length !== 0) throw new Error(`3-digit and 6-digit hex for the same color should not be drift, got ${JSON.stringify(noDrift.tokenDrift)}`);

      const driftFigma: FigmaData = { components: [], variables: { 'color-brand': '#336699' } };
      const driftCode: CodeData = { components: [], tokens: { colorBrand: '#336600' } };
      const withDrift = detectDesignDrift(driftFigma, driftCode);
      const entry = withDrift.tokenDrift.find((t) => t.token === 'color-brand');
      if (!entry) throw new Error(`expected token drift for 'color-brand', got ${JSON.stringify(withDrift.tokenDrift)}`);
      if (entry.figma !== '#336699' || entry.code !== '#336600') {
        throw new Error(`expected original (non-normalized) values in the drift entry, got ${JSON.stringify(entry)}`);
      }
    },
  },
  {
    name: 'handoffChecklist lists missing items in the documented fixed order and computes ready correctly',
    run: async ({ mod }) => {
      const { handoffChecklist } = mod as unknown as Mod;
      const result = handoffChecklist({
        hasStoryForEachVariant: true,
        a11yChecked: false,
        visualBaseline: true,
        figmaLinked: false,
        docsDescription: false,
      });
      if (result.ready) throw new Error('expected ready to be false when items are missing');
      const expected = [
        'a11y addon checked with no violations',
        'linked to its Figma component (Code Connect)',
        'a docs description for the component',
      ];
      if (JSON.stringify(result.missing) !== JSON.stringify(expected)) {
        throw new Error(`expected missing in fixed order ${JSON.stringify(expected)}, got ${JSON.stringify(result.missing)}`);
      }

      const allDone = handoffChecklist({
        hasStoryForEachVariant: true,
        a11yChecked: true,
        visualBaseline: true,
        figmaLinked: true,
        docsDescription: true,
      });
      if (!allDone.ready || allDone.missing.length !== 0) {
        throw new Error(`expected ready: true and an empty missing list when every flag is true, got ${JSON.stringify(allDone)}`);
      }
    },
  },
];
