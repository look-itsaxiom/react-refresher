function toRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [r, g, b];
}

function toHex([r, g, b]: [number, number, number]): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const part = (n: number) => clamp(n).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

function channelLuminance(c: number): number {
  const normalized = c / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = toRgb(hex);
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

export function contrastRatio(fg: string, bg: string): number {
  const lFg = relativeLuminance(fg);
  const lBg = relativeLuminance(bg);
  const lighter = Math.max(lFg, lBg);
  const darker = Math.min(lFg, lBg);
  return (lighter + 0.05) / (darker + 0.05);
}

export function classify(
  ratio: number,
  options: { fontSizePx: number; bold?: boolean },
): { large: boolean; passesAA: boolean; passesAAA: boolean } {
  const large = options.fontSizePx >= 24 || (Boolean(options.bold) && options.fontSizePx >= 18.66);
  const passesAA = ratio >= (large ? 3 : 4.5);
  const passesAAA = ratio >= (large ? 4.5 : 7);
  return { large, passesAA, passesAAA };
}

export function suggestDarken(fg: string, bg: string, target: number): string {
  const lBg = relativeLuminance(bg);
  const lFg = relativeLuminance(fg);
  const darkening = lFg <= lBg;
  let rgb = toRgb(fg);

  for (let step = 0; step < 255; step += 1) {
    if (contrastRatio(toHex(rgb), bg) >= target) break;
    rgb = rgb.map((c) => (darkening ? c - 1 : c + 1)) as [number, number, number];
    if (rgb.every((c) => c <= 0 || c >= 255)) break;
  }

  return toHex(rgb);
}

const SWATCHES: Array<{ label: string; fg: string; bg: string; fontSizePx: number; bold?: boolean }> = [
  { label: 'Body text', fg: '#767676', bg: '#ffffff', fontSizePx: 16 },
  { label: 'Large heading', fg: '#767676', bg: '#ffffff', fontSizePx: 28 },
  { label: 'Bold label', fg: '#595959', bg: '#ffffff', fontSizePx: 16, bold: true },
  { label: 'Low-contrast warning', fg: '#ffcc00', bg: '#ffffff', fontSizePx: 16 },
];

export default function App() {
  return (
    <table>
      <thead>
        <tr>
          <th>Swatch</th>
          <th>Ratio</th>
          <th>AA</th>
          <th>AAA</th>
          <th>Fixed ratio (target 4.5)</th>
        </tr>
      </thead>
      <tbody>
        {SWATCHES.map((s) => {
          const ratio = contrastRatio(s.fg, s.bg);
          const result = classify(ratio, { fontSizePx: s.fontSizePx, bold: s.bold });
          const fixed = suggestDarken(s.fg, s.bg, 4.5);
          const fixedRatio = contrastRatio(fixed, s.bg);
          return (
            <tr key={s.label} style={{ color: s.fg, backgroundColor: s.bg }}>
              <td>{s.label}</td>
              <td>{ratio.toFixed(2)}</td>
              <td>{result.passesAA ? 'AA pass' : 'AA fail'}</td>
              <td>{result.passesAAA ? 'AAA pass' : 'AAA fail'}</td>
              <td>{fixedRatio.toFixed(2)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
