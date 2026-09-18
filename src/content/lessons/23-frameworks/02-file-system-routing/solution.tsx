export type RouteRecord = {
  /** e.g. '/', '/about', '/blog/:slug', '/docs/*parts' */
  pattern: string;
  paramNames: string[];
  filePath: string;
  /** layout.tsx files that wrap this route, root-to-leaf */
  layouts: string[];
};

export type MatchResult = {
  route: RouteRecord;
  params: Record<string, string | string[]>;
};

type SegmentPart = { part: string | null; paramName?: string };

function segmentToPatternPart(segment: string): SegmentPart {
  const catchAll = segment.match(/^\[\.\.\.(\w+)\]$/);
  if (catchAll) return { part: `*${catchAll[1]}`, paramName: catchAll[1] };

  const dynamic = segment.match(/^\[(\w+)\]$/);
  if (dynamic) return { part: `:${dynamic[1]}`, paramName: dynamic[1] };

  if (/^\(.*\)$/.test(segment)) return { part: null };

  return { part: segment };
}

export function buildRoutes(files: string[]): RouteRecord[] {
  const layoutDirs = new Set(
    files.filter((f) => f.endsWith('/layout.tsx')).map((f) => f.slice(0, -'/layout.tsx'.length)),
  );
  const pageFiles = files.filter((f) => f.endsWith('/page.tsx'));

  return pageFiles.map((file) => {
    const dir = file.slice(0, -'/page.tsx'.length); // e.g. 'app/blog/[slug]'
    const rawSegments = dir.split('/');

    const patternParts: string[] = [];
    const paramNames: string[] = [];
    const layouts: string[] = [];
    let prefix = '';

    for (const seg of rawSegments) {
      prefix = prefix ? `${prefix}/${seg}` : seg;
      if (layoutDirs.has(prefix)) layouts.push(`${prefix}/layout.tsx`);
      if (seg === 'app') continue; // root segment, never part of the URL

      const { part, paramName } = segmentToPatternPart(seg);
      if (part === null) continue;
      patternParts.push(part);
      if (paramName) paramNames.push(paramName);
    }

    return {
      pattern: '/' + patternParts.join('/'),
      paramNames,
      filePath: file,
      layouts,
    };
  });
}

export function matchRoute(routes: RouteRecord[], url: string): MatchResult | null {
  const path = (url.split('?')[0] ?? '').replace(/^\/+|\/+$/g, '');
  const urlSegments = path === '' ? [] : path.split('/');

  let best: (MatchResult & { score: number }) | null = null;

  for (const route of routes) {
    const patternPath = route.pattern.replace(/^\/+|\/+$/g, '');
    const patternSegments = patternPath === '' ? [] : patternPath.split('/');
    const lastSegment = patternSegments[patternSegments.length - 1];
    const hasCatchAll = patternSegments.length > 0 && (lastSegment?.startsWith('*') ?? false);

    if (!hasCatchAll && patternSegments.length !== urlSegments.length) continue;
    if (hasCatchAll && urlSegments.length < patternSegments.length) continue;

    const params: Record<string, string | string[]> = {};
    let score = 0;
    let matched = true;

    for (let i = 0; i < patternSegments.length; i++) {
      const patternSeg = patternSegments[i]!;
      if (patternSeg.startsWith(':')) {
        params[patternSeg.slice(1)] = urlSegments[i]!;
        score += 1;
      } else if (patternSeg.startsWith('*')) {
        params[patternSeg.slice(1)] = urlSegments.slice(i);
        score += 0;
      } else if (patternSeg === urlSegments[i]) {
        score += 2;
      } else {
        matched = false;
        break;
      }
    }

    if (!matched) continue;
    if (!best || score > best.score) {
      best = { route, params, score };
    }
  }

  return best ? { route: best.route, params: best.params } : null;
}

function RouteTable({ routes }: { routes: RouteRecord[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Pattern</th>
          <th>Params</th>
          <th>Layouts</th>
        </tr>
      </thead>
      <tbody>
        {routes.map((r) => (
          <tr key={r.filePath}>
            <td>{r.pattern}</td>
            <td>{r.paramNames.join(', ') || '—'}</td>
            <td>{r.layouts.join(' > ') || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const sampleFiles = [
  'app/page.tsx',
  'app/layout.tsx',
  'app/blog/[slug]/page.tsx',
  'app/(marketing)/about/page.tsx',
  'app/docs/[...parts]/page.tsx',
  'app/shop/layout.tsx',
  'app/shop/page.tsx',
];

export default function App() {
  const routes = buildRoutes(sampleFiles);
  return (
    <div style={{ padding: 16, fontFamily: 'monospace' }}>
      <h2>Routes built from {sampleFiles.length} files</h2>
      <RouteTable routes={routes} />
    </div>
  );
}
