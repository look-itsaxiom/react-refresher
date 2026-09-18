export type ValidateResult = { errors: string[]; warnings: string[]; installable: boolean };

const DISPLAY_VALUES = ['fullscreen', 'standalone', 'minimal-ui', 'browser'] as const;
const DISPLAY_OVERRIDE_VALUES = ['fullscreen', 'standalone', 'minimal-ui', 'window-controls-overlay', 'tabbed'];
const DISPLAY_CHAIN = ['fullscreen', 'standalone', 'minimal-ui', 'browser'] as const;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function parseSizes(sizes: unknown): number[] {
  if (typeof sizes !== 'string') return [];
  return sizes
    .trim()
    .split(/\s+/)
    .map((token) => {
      const match = token.match(/^(\d+)x(\d+)$/i);
      return match ? Number(match[1]) : NaN;
    })
    .filter((n) => !Number.isNaN(n));
}

function isImageish(src: unknown): boolean {
  return typeof src === 'string' && /\.(png|svg|webp)$/i.test(src);
}

function iconsArray(manifest: Record<string, unknown>): Record<string, unknown>[] {
  const icons = manifest.icons;
  if (!Array.isArray(icons)) return [];
  return icons.filter((icon): icon is Record<string, unknown> => typeof icon === 'object' && icon !== null);
}

export function validateManifest(manifest: unknown): ValidateResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const m: Record<string, unknown> = typeof manifest === 'object' && manifest !== null ? (manifest as Record<string, unknown>) : {};

  if (!isNonEmptyString(m.name) && !isNonEmptyString(m.short_name)) {
    errors.push('Manifest must have a non-empty "name" or "short_name".');
  }

  const scope = isNonEmptyString(m.scope) ? m.scope : '/';
  if (!isNonEmptyString(m.start_url)) {
    errors.push('Manifest must have a "start_url" string.');
  } else if (!m.start_url.startsWith(scope)) {
    errors.push(`"start_url" (${m.start_url}) must be within "scope" (${scope}).`);
  }

  const display = m.display;
  const displayOverride = Array.isArray(m.display_override)
    ? m.display_override.filter((v): v is string => typeof v === 'string')
    : [];
  const validDisplay = typeof display === 'string' && (DISPLAY_VALUES as readonly string[]).includes(display);
  const validOverride = displayOverride.some((v) => DISPLAY_OVERRIDE_VALUES.includes(v));
  if (!validDisplay && !validOverride) {
    errors.push('"display" must be a valid mode, or "display_override" must contain a supported mode.');
  }

  const icons = iconsArray(m);
  const hasQualifyingIcon = icons.some(
    (icon) => isImageish(icon.src) && parseSizes(icon.sizes).some((w) => w >= 192),
  );
  if (!hasQualifyingIcon) {
    errors.push('Manifest must include a PNG, SVG, or WebP icon with a size of at least 192px.');
  }

  if (!isNonEmptyString(m.id)) {
    warnings.push('Manifest has no "id"; add one to keep future start_url changes from creating duplicate installs.');
  }
  const has512 = icons.some((icon) => parseSizes(icon.sizes).some((w) => w >= 512));
  if (!has512) {
    warnings.push('No icon is 512px or larger; add one for a sharper install and splash icon.');
  }
  const hasMaskable = icons.some((icon) => icon.purpose === 'maskable');
  if (!hasMaskable) {
    warnings.push('No icon has "purpose": "maskable"; add one for adaptive icon shapes.');
  }
  const screenshots = m.screenshots;
  if (!Array.isArray(screenshots) || screenshots.length === 0) {
    warnings.push('No "screenshots" provided; richer install UI needs at least one.');
  }
  if (isNonEmptyString(m.theme_color) && !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(m.theme_color)) {
    warnings.push('"theme_color" is not a valid hex color.');
  }

  return { errors, warnings, installable: errors.length === 0 };
}

export function resolveDisplayMode(
  manifest: { display?: string; display_override?: string[] },
  supported: string[],
): string {
  const override = manifest.display_override ?? [];
  for (const mode of override) {
    if (supported.includes(mode)) return mode;
  }

  const startIndex =
    manifest.display && (DISPLAY_CHAIN as readonly string[]).includes(manifest.display)
      ? DISPLAY_CHAIN.indexOf(manifest.display as (typeof DISPLAY_CHAIN)[number])
      : DISPLAY_CHAIN.indexOf('browser');

  for (let i = startIndex; i < DISPLAY_CHAIN.length; i++) {
    const mode = DISPLAY_CHAIN[i]!;
    if (mode === 'browser' || supported.includes(mode)) return mode;
  }
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
