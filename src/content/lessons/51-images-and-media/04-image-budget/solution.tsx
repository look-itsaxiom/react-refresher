export type Format = 'avif' | 'webp' | 'jpeg';

export type ImageSpec = {
  role: 'hero' | 'content';
  url: string;
  renderedWidth: number;
  widths: number[];
  bytesByWidth: Record<Format, Record<number, number>>;
  lazy: boolean;
  hasDimensions: boolean;
};

export type BudgetResult = {
  totalBytes: number;
  issues: string[];
  preloadHeader: string | null;
};

export function pickFormat(accept: string): Format {
  if (accept.includes('image/avif')) return 'avif';
  if (accept.includes('image/webp')) return 'webp';
  return 'jpeg';
}

export function pickWidth(available: number[], renderedWidth: number, dpr: number): number {
  const target = renderedWidth * dpr;
  const sorted = [...available].sort((a, b) => a - b);
  const fit = sorted.find((w) => w >= target);
  return fit ?? sorted[sorted.length - 1]!;
}

export function imageBudget(images: ImageSpec[], accept: string, dpr: number): BudgetResult {
  const format = pickFormat(accept);
  let totalBytes = 0;
  const issues: string[] = [];
  let preloadHeader: string | null = null;

  for (const image of images) {
    const width = pickWidth(image.widths, image.renderedWidth, dpr);
    totalBytes += image.bytesByWidth[format][width]!;

    if (image.role === 'hero' && image.lazy) {
      issues.push(`lazy-hero:${image.url}`);
    }
    if (!image.hasDimensions) {
      issues.push(`missing-dimensions:${image.url}`);
    }
    const target = image.renderedWidth * dpr;
    if (width > target * 1.5) {
      issues.push(`oversized:${image.url}`);
    }

    if (image.role === 'hero' && preloadHeader === null) {
      const ext = format === 'jpeg' ? 'jpg' : format;
      preloadHeader = `<${image.url}.${ext}?w=${width}>; rel=preload; as=image; type="image/${format}"`;
    }
  }

  return { totalBytes, issues, preloadHeader };
}

const samplePage: ImageSpec[] = [
  {
    role: 'hero',
    url: 'https://cdn.example.com/photos/harbor',
    renderedWidth: 1200,
    widths: [400, 800, 1200, 1600],
    bytesByWidth: {
      avif: { 400: 20_000, 800: 60_000, 1200: 110_000, 1600: 180_000 },
      webp: { 400: 30_000, 800: 90_000, 1200: 160_000, 1600: 260_000 },
      jpeg: { 400: 45_000, 800: 130_000, 1200: 230_000, 1600: 360_000 },
    },
    lazy: false,
    hasDimensions: true,
  },
];

export default function App() {
  const result = imageBudget(samplePage, 'image/avif,image/webp,*/*', 1);
  return <pre>{JSON.stringify(result, null, 2)}</pre>;
}
