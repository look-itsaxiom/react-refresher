import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'buildSrcset joins width descriptors built from a ?w= query parameter',
    run: ({ mod, expect }) => {
      const buildSrcset = (mod as any).buildSrcset as (baseUrl: string, widths: number[]) => string;
      expect(buildSrcset('https://cdn.example.com/harbor.jpg', [400, 800])).to.equal(
        'https://cdn.example.com/harbor.jpg?w=400 400w, https://cdn.example.com/harbor.jpg?w=800 800w',
      );
      expect(buildSrcset('https://cdn.example.com/harbor.jpg', [1200])).to.equal(
        'https://cdn.example.com/harbor.jpg?w=1200 1200w',
      );
    },
  },
  {
    name: 'pickSizes returns the right sizes value for each layout',
    run: ({ mod, expect }) => {
      const pickSizes = (mod as any).pickSizes as (layout: 'hero' | 'card' | 'thumb') => string;
      expect(pickSizes('hero')).to.equal('100vw');
      expect(pickSizes('card')).to.equal('(min-width: 768px) 33vw, 100vw');
      expect(pickSizes('thumb')).to.equal('96px');
    },
  },
  {
    name: 'a non-priority image lazy-loads, and a priority image loads eagerly at high fetch priority',
    run: ({ mod, render, screen, expect }) => {
      const ResponsiveImage = (mod as any).ResponsiveImage;
      render(
        <ResponsiveImage
          baseUrl="https://cdn.example.com/product"
          alt="Wireless headphones"
          widths={[300, 600, 900]}
          width={900}
          height={900}
          layout="card"
        />,
      );
      const img = screen.getByAltText('Wireless headphones') as HTMLImageElement;
      expect(img.getAttribute('loading'), 'a non-priority image must not load eagerly').to.equal('lazy');
      expect(img.getAttribute('fetchpriority'), 'a non-priority image must not force high fetch priority').to.not.equal('high');

      render(
        <ResponsiveImage
          baseUrl="https://cdn.example.com/harbor"
          alt="Harbor at dawn"
          widths={[400, 800, 1200, 1600]}
          width={1600}
          height={900}
          layout="hero"
          priority
        />,
      );
      const hero = screen.getByAltText('Harbor at dawn') as HTMLImageElement;
      expect(hero.getAttribute('loading'), 'the LCP image must not be lazy-loaded').to.equal('eager');
      expect(hero.getAttribute('fetchpriority')).to.equal('high');
    },
  },
  {
    name: 'the fallback img carries width, height, decoding="async", and a srcset built from the .jpg variant',
    run: ({ mod, render, screen, expect }) => {
      const ResponsiveImage = (mod as any).ResponsiveImage;
      render(
        <ResponsiveImage
          baseUrl="https://cdn.example.com/harbor"
          alt="Harbor at dawn"
          widths={[400, 800]}
          width={1600}
          height={900}
          layout="hero"
          priority
        />,
      );
      const img = screen.getByAltText('Harbor at dawn') as HTMLImageElement;
      expect(img.width, 'width attribute must be set to prevent layout shift').to.equal(1600);
      expect(img.height, 'height attribute must be set to prevent layout shift').to.equal(900);
      expect(img.getAttribute('decoding')).to.equal('async');
      expect(img.getAttribute('srcset') ?? '').to.include('harbor.jpg?w=400 400w');
      expect(img.getAttribute('srcset') ?? '').to.include('harbor.jpg?w=800 800w');
      expect(img.getAttribute('sizes')).to.equal('100vw');
    },
  },
  {
    name: 'renders AVIF and WebP <source> elements inside a <picture>, each with a format-specific srcset',
    run: ({ mod, render, screen, expect }) => {
      const ResponsiveImage = (mod as any).ResponsiveImage;
      render(
        <ResponsiveImage
          baseUrl="https://cdn.example.com/product"
          alt="Wireless headphones"
          widths={[300, 600]}
          width={900}
          height={900}
          layout="card"
        />,
      );
      const img = screen.getByAltText('Wireless headphones');
      const picture = img.closest('picture');
      expect(picture, 'the img must be inside a <picture> element').to.exist;

      const sources = Array.from(picture!.querySelectorAll('source'));
      const avif = sources.find((s) => s.getAttribute('type') === 'image/avif');
      const webp = sources.find((s) => s.getAttribute('type') === 'image/webp');
      expect(avif, 'expected a <source type="image/avif">').to.exist;
      expect(webp, 'expected a <source type="image/webp">').to.exist;
      expect(avif!.getAttribute('srcset') ?? '').to.include('product.avif?w=300 300w');
      expect(webp!.getAttribute('srcset') ?? '').to.include('product.webp?w=600 600w');
      expect(avif!.getAttribute('sizes')).to.equal('(min-width: 768px) 33vw, 100vw');
    },
  },
];
