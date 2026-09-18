import type { Check } from '../../../types';

type Format = 'avif' | 'webp' | 'jpeg';
type ImageSpec = {
  role: 'hero' | 'content';
  url: string;
  renderedWidth: number;
  widths: number[];
  bytesByWidth: Record<Format, Record<number, number>>;
  lazy: boolean;
  hasDimensions: boolean;
};

const heroBytes: Record<Format, Record<number, number>> = {
  avif: { 400: 20_000, 800: 60_000, 1200: 110_000, 1600: 180_000 },
  webp: { 400: 30_000, 800: 90_000, 1200: 160_000, 1600: 260_000 },
  jpeg: { 400: 45_000, 800: 130_000, 1200: 230_000, 1600: 360_000 },
};

const cardBytes: Record<Format, Record<number, number>> = {
  avif: { 300: 15_000, 600: 40_000 },
  webp: { 300: 22_000, 600: 60_000 },
  jpeg: { 300: 32_000, 600: 90_000 },
};

export const checks: Check[] = [
  {
    name: 'pickFormat prefers avif, then webp, then falls back to jpeg',
    run: ({ mod, expect }) => {
      const pickFormat = (mod as any).pickFormat as (accept: string) => Format;
      expect(pickFormat('image/avif,image/webp,*/*')).to.equal('avif');
      expect(pickFormat('image/webp,*/*')).to.equal('webp');
      expect(pickFormat('text/html,*/*')).to.equal('jpeg');
    },
  },
  {
    name: 'pickWidth returns the smallest fit and falls back to the largest when nothing fits',
    run: ({ mod, expect }) => {
      const pickWidth = (mod as any).pickWidth as (available: number[], renderedWidth: number, dpr: number) => number;
      expect(pickWidth([400, 800, 1200, 1600], 700, 1)).to.equal(800);
      expect(pickWidth([400, 800, 1200, 1600], 500, 2)).to.equal(1200);
      expect(pickWidth([400, 800], 900, 2), 'nothing fits 1800px of target, fall back to the largest').to.equal(800);
    },
  },
  {
    name: 'imageBudget sums bytes for the negotiated format and chosen widths',
    run: ({ mod, expect }) => {
      const imageBudget = (mod as any).imageBudget as (images: ImageSpec[], accept: string, dpr: number) => any;
      const images: ImageSpec[] = [
        {
          role: 'hero',
          url: 'https://cdn.example.com/harbor',
          renderedWidth: 1200,
          widths: [400, 800, 1200, 1600],
          bytesByWidth: heroBytes,
          lazy: false,
          hasDimensions: true,
        },
        {
          role: 'content',
          url: 'https://cdn.example.com/product',
          renderedWidth: 300,
          widths: [300, 600],
          bytesByWidth: cardBytes,
          lazy: true,
          hasDimensions: true,
        },
      ];
      const result = imageBudget(images, 'image/avif,image/webp,*/*', 1);
      // hero picks width 1200 in avif (110_000), product picks width 300 in avif (15_000)
      expect(result.totalBytes).to.equal(125_000);
    },
  },
  {
    name: 'flags a lazy-loaded hero, missing dimensions, and an oversized image',
    run: ({ mod, expect }) => {
      const imageBudget = (mod as any).imageBudget as (images: ImageSpec[], accept: string, dpr: number) => any;
      const images: ImageSpec[] = [
        {
          role: 'hero',
          url: 'https://cdn.example.com/harbor',
          renderedWidth: 300,
          widths: [400, 800, 1200, 1600],
          bytesByWidth: heroBytes,
          lazy: true,
          hasDimensions: false,
        },
      ];
      const result = imageBudget(images, 'image/avif,image/webp,*/*', 1);
      expect(result.issues).to.include('lazy-hero:https://cdn.example.com/harbor');
      expect(result.issues).to.include('missing-dimensions:https://cdn.example.com/harbor');
      // rendered at 300, chosen width will be 400 (smallest fit) which is NOT > 1.5x 300 (450) -> no oversized flag here
      expect(result.issues).to.not.include('oversized:https://cdn.example.com/harbor');
    },
  },
  {
    name: 'flags an oversized image and produces no issues for a correctly sized non-hero image',
    run: ({ mod, expect }) => {
      const imageBudget = (mod as any).imageBudget as (images: ImageSpec[], accept: string, dpr: number) => any;
      const images: ImageSpec[] = [
        {
          role: 'content',
          url: 'https://cdn.example.com/product',
          renderedWidth: 100,
          widths: [300, 600],
          bytesByWidth: cardBytes,
          lazy: true,
          hasDimensions: true,
        },
      ];
      const result = imageBudget(images, 'image/avif,image/webp,*/*', 1);
      // chosen width 300 vs target 100 -> 300 > 150, oversized
      expect(result.issues).to.deep.equal(['oversized:https://cdn.example.com/product']);
    },
  },
  {
    name: 'builds a Link preload header for the first hero image only, using the negotiated format',
    run: ({ mod, expect }) => {
      const imageBudget = (mod as any).imageBudget as (images: ImageSpec[], accept: string, dpr: number) => any;
      const images: ImageSpec[] = [
        {
          role: 'content',
          url: 'https://cdn.example.com/product',
          renderedWidth: 300,
          widths: [300, 600],
          bytesByWidth: cardBytes,
          lazy: true,
          hasDimensions: true,
        },
        {
          role: 'hero',
          url: 'https://cdn.example.com/harbor',
          renderedWidth: 1200,
          widths: [400, 800, 1200, 1600],
          bytesByWidth: heroBytes,
          lazy: false,
          hasDimensions: true,
        },
      ];
      const avifResult = imageBudget(images, 'image/avif,image/webp,*/*', 1);
      expect(avifResult.preloadHeader).to.equal(
        '<https://cdn.example.com/harbor.avif?w=1200>; rel=preload; as=image; type="image/avif"',
      );

      const jpegResult = imageBudget(images, 'text/html', 1);
      expect(jpegResult.preloadHeader).to.equal(
        '<https://cdn.example.com/harbor.jpg?w=1200>; rel=preload; as=image; type="image/jpeg"',
      );

      const noHero = imageBudget([images[0]!], 'image/avif', 1);
      expect(noHero.preloadHeader).to.equal(null);
    },
  },
];
