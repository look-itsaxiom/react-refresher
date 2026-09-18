export type ValidateResult = { errors: string[]; warnings: string[]; installable: boolean };

const DISPLAY_VALUES = ['fullscreen', 'standalone', 'minimal-ui', 'browser'] as const;
const DISPLAY_OVERRIDE_VALUES = ['fullscreen', 'standalone', 'minimal-ui', 'window-controls-overlay', 'tabbed'];
const DISPLAY_CHAIN = ['fullscreen', 'standalone', 'minimal-ui', 'browser'] as const;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

// TODO: parse a `sizes` string like "192x192" or "48x48 192x192" into an array of widths.
// Return [] for anything that isn't a parseable sizes string.
function parseSizes(_sizes: unknown): number[] {
  return [];
}

// TODO: true when `src` is a string ending in .png, .svg, or .webp (case-insensitive).
function isImageish(_src: unknown): boolean {
  return false;
}

function iconsArray(manifest: Record<string, unknown>): Record<string, unknown>[] {
  const icons = manifest.icons;
  if (!Array.isArray(icons)) return [];
  return icons.filter((icon): icon is Record<string, unknown> => typeof icon === 'object' && icon !== null);
}

// TODO: implement the rule set from the prompt. Errors first (in the listed order), then
// warnings (in the listed order). `installable` is true only when `errors` is empty.
export function validateManifest(_manifest: unknown): ValidateResult {
  return { errors: [], warnings: [], installable: false };
}

// TODO: walk `display_override` first (returning the first entry present in `supported`),
// then fall back to walking DISPLAY_CHAIN starting from `manifest.display`'s position
// (or from 'browser' if `display` is missing/unrecognized). 'browser' always counts as
// supported and is the final fallback.
export function resolveDisplayMode(
  _manifest: { display?: string; display_override?: string[] },
  _supported: string[],
): string {
  return 'browser';
}

const fixtureManifest = {
  name: 'Fixture App',
  start_url: '/app/start',
  scope: '/app/',
  display: 'standalone',
  icons: [{ src: '/icon-192.png', sizes: '192x192' }],
  theme_color: 'blue',
};

export default function App() {
  const result = validateManifest(fixtureManifest);
  const mode = resolveDisplayMode({ display: 'standalone' }, ['minimal-ui', 'browser']);
  return (
    <div style={{ padding: 16, fontFamily: 'monospace' }}>
      <p data-testid="installable">Installable: {result.installable ? 'Yes' : 'No'}</p>
      <p data-testid="error-count">Errors: {result.errors.length}</p>
      <p data-testid="warning-count">Warnings: {result.warnings.length}</p>
      <p data-testid="resolved-mode">Resolved display mode: {mode}</p>
    </div>
  );
}
