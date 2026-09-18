import type { Check } from '../../../types';

type Classify = (ratio: number, options: { fontSizePx: number; bold?: boolean }) => {
  large: boolean;
  passesAA: boolean;
  passesAAA: boolean;
};

export const checks: Check[] = [
  {
    name: 'relativeLuminance treats white as 1 and black as 0',
    run: ({ mod, expect }) => {
      const relativeLuminance = mod.relativeLuminance as (hex: string) => number;
      expect(relativeLuminance('#ffffff')).to.be.closeTo(1, 0.001);
      expect(relativeLuminance('#000000')).to.be.closeTo(0, 0.001);
    },
  },
  {
    name: 'contrastRatio(#767676, #ffffff) is approximately 4.54, and is symmetric',
    run: ({ mod, expect }) => {
      const contrastRatio = mod.contrastRatio as (fg: string, bg: string) => number;
      const ratio = contrastRatio('#767676', '#ffffff');
      expect(ratio, 'the textbook WCAG example pair should read ~4.54:1').to.be.closeTo(4.54, 0.05);
      expect(contrastRatio('#ffffff', '#767676'), 'contrastRatio must not depend on argument order').to.be.closeTo(ratio, 0.001);
    },
  },
  {
    name: 'classify applies the AA/AAA thresholds for normal text',
    run: ({ mod, expect }) => {
      const classify = mod.classify as Classify;
      const passing = classify(4.54, { fontSizePx: 16 });
      expect(passing.large).to.equal(false);
      expect(passing.passesAA, '4.54:1 clears the 4.5:1 normal-text AA threshold').to.equal(true);
      expect(passing.passesAAA, '4.54:1 does not clear the 7:1 normal-text AAA threshold').to.equal(false);

      const failing = classify(3.0, { fontSizePx: 16 });
      expect(failing.passesAA, '3:1 is below the 4.5:1 threshold for normal-size text').to.equal(false);
    },
  },
  {
    name: 'classify only counts text as "large" at >=24px, or >=18.66px when bold',
    run: ({ mod, expect }) => {
      const classify = mod.classify as Classify;
      expect(classify(3.2, { fontSizePx: 16, bold: true }).large, 'bold alone is not enough below 18.66px').to.equal(false);
      expect(classify(3.2, { fontSizePx: 20, bold: true }).large, 'bold and >=18.66px is large').to.equal(true);
      expect(classify(3.2, { fontSizePx: 28 }).large, '>=24px is large regardless of weight').to.equal(true);

      const large = classify(3.2, { fontSizePx: 28 });
      expect(large.passesAA, '3.2:1 clears the 3:1 large-text AA threshold').to.equal(true);
      expect(large.passesAAA, '3.2:1 does not clear the 4.5:1 large-text AAA threshold').to.equal(false);
    },
  },
  {
    name: 'suggestDarken darkens a light foreground on a light background until it meets the target',
    run: ({ mod, expect }) => {
      const contrastRatio = mod.contrastRatio as (fg: string, bg: string) => number;
      const suggestDarken = mod.suggestDarken as (fg: string, bg: string, target: number) => string;
      const before = contrastRatio('#ffcc00', '#ffffff');
      const fixed = suggestDarken('#ffcc00', '#ffffff', 4.5);
      const after = contrastRatio(fixed, '#ffffff');
      expect(before, 'the starting pair should be well under target').to.be.lessThan(4.5);
      expect(after, 'the returned color must meet the requested ratio against the same background').to.be.at.least(4.5);
    },
  },
  {
    name: 'suggestDarken lightens a dark foreground on a dark background, not just literally darkens it',
    run: ({ mod, expect }) => {
      const contrastRatio = mod.contrastRatio as (fg: string, bg: string) => number;
      const suggestDarken = mod.suggestDarken as (fg: string, bg: string, target: number) => string;
      const before = contrastRatio('#555555', '#000000');
      const fixed = suggestDarken('#555555', '#000000', 4.5);
      const after = contrastRatio(fixed, '#000000');
      expect(before).to.be.lessThan(4.5);
      expect(after, 'against a near-black background the fix has to move toward white, not toward black').to.be.at.least(4.5);
    },
  },
  {
    name: 'the swatch table renders the computed ratio and AA verdict for each row',
    run: ({ render, screen, within, expect, Component }) => {
      render(<Component />);
      const row = screen.getByText('Body text').closest('tr');
      expect(row, 'expected a table row for "Body text"').to.exist;
      expect(row!.textContent).to.match(/4\.5\d/);
      expect(within(row!).getByText('AA pass')).to.exist;

      const warningRow = screen.getByText('Low-contrast warning').closest('tr');
      expect(warningRow, 'expected a table row for "Low-contrast warning"').to.exist;
      expect(within(warningRow!).getByText('AA fail')).to.exist;
    },
  },
];
