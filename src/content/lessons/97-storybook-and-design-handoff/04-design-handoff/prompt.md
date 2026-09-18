Build a design-handoff diff tool: compare a Figma-variables-shaped export against your code's
component and token manifest, and report where they've drifted apart. Then build a small
definition-of-done checklist for a single component.

```ts
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

function detectDesignDrift(figma: FigmaData, code: CodeData): DriftReport;

type ComponentReadiness = {
  hasStoryForEachVariant: boolean;
  a11yChecked: boolean;
  visualBaseline: boolean;
  figmaLinked: boolean;
  docsDescription: boolean;
};
function handoffChecklist(component: ComponentReadiness): { missing: string[]; ready: boolean };
```

## `detectDesignDrift`

Names on both sides may be written in either kebab-case (`"primary-button"`) or camelCase
(`"primaryButton"`) — normalize before comparing: lowercase, then strip `-`, `_`, and spaces, so
`"primary-button"` and `"primaryButton"` both normalize to `"primarybutton"` and are treated as
the same component or the same prop.

1. **`missingInCode`**: names (as written in `figma.components`) of components with no
   normalized-name match anywhere in `code.components`.
2. **`missingInFigma`**: names (as written in `code.components`) of components with no
   normalized-name match anywhere in `figma.components`.
3. **`propMismatches`**, computed only for components matched on both sides (by normalized name;
   report the **Figma** component's `name` and the **Figma** property name in every mismatch
   entry for a matched pair):
   - a Figma property with no normalized-name match among the matched code component's props →
     `kind: 'missing-in-code'`.
   - a code prop with no normalized-name match among the matched Figma component's properties →
     `kind: 'missing-in-figma'`.
   - a matched pair where both sides describe a choice type (Figma `'variant'` and code `'enum'`
     are the same kind) and their `options` differ as sets, compared case-insensitively → include
     both with `kind: 'options-differ'`; matching options in a different order or a different
     case is **not** a mismatch. `'variant'`/`'enum'` vs. any other type is not itself a
     mismatch kind this function reports — only the three kinds above exist.
4. **`tokenDrift`**: for token names present in both `figma.variables` and `code.tokens`
   (normalized-name match again), compare their color values after normalizing: lowercase, and
   expand a 3-digit hex (`#fff`) to 6 digits (`#ffffff`). Report an entry (with the two *original*
   string values) only where the normalized values differ.

## `handoffChecklist`

Given a component's readiness flags, return `missing` — human-readable labels, in this fixed
order regardless of which flags are false — for every flag that's `false`:

1. `hasStoryForEachVariant` → `"a story for every variant"`
2. `a11yChecked` → `"a11y addon checked with no violations"`
3. `visualBaseline` → `"a visual regression baseline approved"`
4. `figmaLinked` → `"linked to its Figma component (Code Connect)"`
5. `docsDescription` → `"a docs description for the component"`

`ready` is `true` exactly when `missing` is empty.
