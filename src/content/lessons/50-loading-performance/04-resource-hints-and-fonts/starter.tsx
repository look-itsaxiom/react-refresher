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
  // TODO:
  // 1. If `route` isn't in manifest.routes, return [].
  // 2. modulepreload for each of the route's chunks.
  // 3. preload (as: 'image', fetchPriority: 'high') for the route's lcpImage, if any.
  // 4. preconnect for each of manifest.thirdPartyOrigins, if any.
  // 5. prefetch (fetchPriority: 'low') for each chunk of each route in nextRoutes.
  return [];
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

export function fontStrategy(fonts: FontSpec[]): FontDecision[] {
  // TODO:
  // - role 'body': fontDisplay 'swap', preload true. If fallbackMetrics is present,
  //   css is the real @font-face block PLUS a fallback @font-face block for
  //   `${family} Fallback` with size-adjust (and ascent-override, if given).
  // - any other role: fontDisplay 'optional', preload false, css is just the one
  //   @font-face block (even if fallbackMetrics is present).
  return fonts.map((font) => ({
    family: font.family,
    fontDisplay: 'optional',
    preload: false,
    css: '',
  }));
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
