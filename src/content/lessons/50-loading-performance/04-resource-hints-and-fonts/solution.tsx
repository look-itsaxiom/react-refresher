export type LinkDescriptor = {
  rel: 'modulepreload' | 'preload' | 'preconnect' | 'prefetch';
  href: string;
  as?: string;
  fetchPriority?: 'high' | 'low' | 'auto';
};

export type RouteInfo = {
  chunks: string[];
  lcpImage?: string;
  nextRoutes?: string[];
};

export type RouteManifest = {
  routes: Record<string, RouteInfo>;
  thirdPartyOrigins?: string[];
};

export function planResourceHints(manifest: RouteManifest, route: string): LinkDescriptor[] {
  const info = manifest.routes[route];
  if (!info) return [];

  const hints: LinkDescriptor[] = [];

  for (const href of info.chunks) {
    hints.push({ rel: 'modulepreload', href });
  }

  if (info.lcpImage) {
    hints.push({ rel: 'preload', href: info.lcpImage, as: 'image', fetchPriority: 'high' });
  }

  for (const href of manifest.thirdPartyOrigins ?? []) {
    hints.push({ rel: 'preconnect', href });
  }

  for (const nextRoute of info.nextRoutes ?? []) {
    const nextInfo = manifest.routes[nextRoute];
    if (!nextInfo) continue;
    for (const href of nextInfo.chunks) {
      hints.push({ rel: 'prefetch', href, fetchPriority: 'low' });
    }
  }

  return hints;
}

export type FontRole = 'body' | 'icon' | 'display';

export type FallbackMetrics = {
  fallbackFamily: string;
  sizeAdjust: number;
  ascentOverride?: number;
};

export type FontSpec = {
  family: string;
  role: FontRole;
  src: string;
  fallbackMetrics?: FallbackMetrics;
};

export type FontDecision = {
  family: string;
  fontDisplay: 'swap' | 'optional';
  preload: boolean;
  css: string;
};

function realFontFace(font: FontSpec, fontDisplay: 'swap' | 'optional'): string {
  return `@font-face {\n  font-family: '${font.family}';\n  src: url('${font.src}');\n  font-display: ${fontDisplay};\n}`;
}

function fallbackFontFace(font: FontSpec, metrics: FallbackMetrics): string {
  const lines = [
    `@font-face {`,
    `  font-family: '${font.family} Fallback';`,
    `  src: local('${metrics.fallbackFamily}');`,
    `  size-adjust: ${metrics.sizeAdjust}%;`,
  ];
  if (metrics.ascentOverride !== undefined) {
    lines.push(`  ascent-override: ${metrics.ascentOverride}%;`);
  }
  lines.push(`}`);
  return lines.join('\n');
}

export function fontStrategy(fonts: FontSpec[]): FontDecision[] {
  return fonts.map((font) => {
    if (font.role === 'body') {
      const blocks = [realFontFace(font, 'swap')];
      if (font.fallbackMetrics) blocks.push(fallbackFontFace(font, font.fallbackMetrics));
      return { family: font.family, fontDisplay: 'swap', preload: true, css: blocks.join('\n\n') };
    }
    return { family: font.family, fontDisplay: 'optional', preload: false, css: realFontFace(font, 'optional') };
  });
}

const exampleManifest: RouteManifest = {
  routes: {
    home: { chunks: ['chunk-home.js'], lcpImage: '/images/hero.jpg', nextRoutes: ['products'] },
    products: { chunks: ['chunk-products.js'] },
  },
  thirdPartyOrigins: ['https://analytics.example.com'],
};

export default function App() {
  const hints = planResourceHints(exampleManifest, 'home');
  const fonts = fontStrategy([{ family: 'Inter', role: 'body', src: '/fonts/inter.woff2' }]);
  return (
    <div style={{ fontFamily: 'monospace', padding: 16 }}>
      <h2>Resource hints for "home"</h2>
      <pre>{JSON.stringify(hints, null, 2)}</pre>
      <h2>Font strategy</h2>
      <pre>{JSON.stringify(fonts, null, 2)}</pre>
    </div>
  );
}
