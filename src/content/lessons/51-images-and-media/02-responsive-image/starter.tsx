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

export function buildSrcset(_baseUrl: string, _widths: number[]): string {
  // TODO: return a srcset string like "url?w=400 400w, url?w=800 800w"
  return '';
}

export function pickSizes(_layout: Layout): string {
  // TODO: 'hero' -> '100vw', 'card' -> '(min-width: 768px) 33vw, 100vw', 'thumb' -> '96px'
  return '';
}

export function ResponsiveImage({ baseUrl, alt, width, height }: ResponsiveImageProps) {
  // TODO: render a <picture> with AVIF/WebP <source> elements and a fallback <img> that
  // carries srcset, sizes, width/height, decoding="async", and loading/fetchPriority based
  // on the `priority` prop.
  return <img src={baseUrl} alt={alt} loading="lazy" width={width} height={height} />;
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
