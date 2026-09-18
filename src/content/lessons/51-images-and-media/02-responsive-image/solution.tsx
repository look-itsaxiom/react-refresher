type Layout = 'hero' | 'card' | 'thumb';

export type ResponsiveImageProps = {
  baseUrl: string;
  alt: string;
  widths: number[];
  width: number;
  height: number;
  layout: Layout;
  priority?: boolean;
};

export function buildSrcset(baseUrl: string, widths: number[]): string {
  return widths.map((w) => `${baseUrl}?w=${w} ${w}w`).join(', ');
}

export function pickSizes(layout: Layout): string {
  switch (layout) {
    case 'hero':
      return '100vw';
    case 'card':
      return '(min-width: 768px) 33vw, 100vw';
    case 'thumb':
      return '96px';
  }
}

export function ResponsiveImage({ baseUrl, alt, widths, width, height, layout, priority }: ResponsiveImageProps) {
  const sizes = pickSizes(layout);
  const largest = widths[widths.length - 1] ?? width;

  return (
    <picture>
      <source type="image/avif" srcSet={buildSrcset(`${baseUrl}.avif`, widths)} sizes={sizes} />
      <source type="image/webp" srcSet={buildSrcset(`${baseUrl}.webp`, widths)} sizes={sizes} />
      <img
        src={`${baseUrl}.jpg?w=${largest}`}
        srcSet={buildSrcset(`${baseUrl}.jpg`, widths)}
        sizes={sizes}
        width={width}
        height={height}
        alt={alt}
        decoding="async"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
      />
    </picture>
  );
}

export default function App() {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <ResponsiveImage
        baseUrl="https://cdn.example.com/harbor"
        alt="Container ship entering the harbor at dawn"
        widths={[400, 800, 1200, 1600]}
        width={1600}
        height={900}
        layout="hero"
        priority
      />
      <ResponsiveImage
        baseUrl="https://cdn.example.com/product"
        alt="Wireless headphones on a white background"
        widths={[300, 600, 900]}
        width={900}
        height={900}
        layout="card"
      />
    </div>
  );
}
