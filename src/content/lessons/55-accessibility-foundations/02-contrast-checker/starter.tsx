// TODO: implement the WCAG relative luminance formula.
export function relativeLuminance(hex: string): number {
  return 1;
}

// TODO: (L1 + 0.05) / (L2 + 0.05), where L1 is the lighter of the two colors.
export function contrastRatio(fg: string, bg: string): number {
  return 1;
}

// TODO: decide "large text" (>=24px, or >=18.66px bold), then check the ratio
// against the AA/AAA thresholds for that size.
export function classify(
  ratio: number,
  options: { fontSizePx: number; bold?: boolean },
): { large: boolean; passesAA: boolean; passesAAA: boolean } {
  return { large: false, passesAA: false, passesAAA: false };
}

// TODO: nudge `fg` toward black or white (whichever increases contrast against
// `bg`) until contrastRatio(result, bg) >= target, or an extreme is reached.
export function suggestDarken(fg: string, bg: string, target: number): string {
  return fg;
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
