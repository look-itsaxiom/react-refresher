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

export function pickFormat(_accept: string): Format {
  // TODO: look for "image/avif", then "image/webp", in the Accept header; default 'jpeg'
  return 'jpeg';
}

export function pickWidth(available: number[], _renderedWidth: number, _dpr: number): number {
  // TODO: smallest available width >= renderedWidth * dpr, or the largest if none qualify
  return available[available.length - 1]!;
}

export function imageBudget(images: ImageSpec[], accept: string, dpr: number): BudgetResult {
  const format = pickFormat(accept);
  let totalBytes = 0;
  const issues: string[] = [];

  for (const image of images) {
    const width = pickWidth(image.widths, image.renderedWidth, dpr);
    totalBytes += image.bytesByWidth[format][width]!;
    // TODO: flag lazy-hero, missing-dimensions, and oversized issues
  }

  // TODO: build the preload header for the first hero image
  return { totalBytes, issues, preloadHeader: null };
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
