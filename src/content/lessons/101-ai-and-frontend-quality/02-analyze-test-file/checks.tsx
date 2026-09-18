import type { Check } from '../../../types';

type AnalyzedTest = { name: string; smells: string[] };
type AnalyzeResult = { tests: AnalyzedTest[]; score: number; summary: string[] };
type AnalyzeFn = (source: string) => AnalyzeResult;

function getAnalyzer({ mod }: { mod: Record<string, unknown> }): AnalyzeFn {
  const fn = mod.analyzeTestFile;
  if (typeof fn !== 'function') {
    throw new Error('Expected the module to export a function named `analyzeTestFile`.');
  }
  return fn as AnalyzeFn;
}

const SMELLY_FILE = `import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Cart } from './Cart';

vi.mock('./Cart');

describe('Cart', () => {
  it('renders', () => {
    const { container } = render(<Cart items={[]} />);
    expect(true).toBe(true);
  });

  it('updates quantity', () => {
    const { container } = render(<Cart items={[{ id: 1, qty: 1 }]} />);
    fireEvent.click(container.querySelector('.qty-plus'));
  });

  it('matches snapshot A', () => {
    const { asFragment } = render(<Cart items={[]} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot B', () => {
    const { asFragment } = render(<Cart items={[{ id: 2, qty: 3 }]} />);
    expect(asFragment()).toMatchSnapshot();
  });
});
`;

const CLEAN_FILE = `import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { Cart } from './Cart';

describe('Cart', () => {
  it('renders each item by name', () => {
    render(<Cart items={[{ id: 1, name: 'Socks', qty: 1 }]} />);
    expect(screen.getByText('Socks')).toBeInTheDocument();
  });

  it('increments quantity when the plus button is clicked', async () => {
    const user = userEvent.setup();
    render(<Cart items={[{ id: 1, name: 'Socks', qty: 1 }]} />);
    await user.click(screen.getByRole('button', { name: /increase quantity/i }));
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows an empty-cart message when there are no items', () => {
    render(<Cart items={[]} />);
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
  });

  it('rejects a quantity below zero and shows an error', async () => {
    const user = userEvent.setup();
    render(<Cart items={[{ id: 1, name: 'Socks', qty: 0 }]} />);
    await user.click(screen.getByRole('button', { name: /decrease quantity/i }));
    expect(screen.getByText(/quantity can.t go below zero/i)).toBeInTheDocument();
  });
});
`;

function findTest(result: AnalyzeResult, namePart: string): AnalyzedTest {
  const t = result.tests.find((x) => x.name.includes(namePart));
  if (!t) throw new Error(`Expected a test with a name containing "${namePart}"`);
  return t;
}

export const checks: Check[] = [
  {
    name: 'finds all four tests in the smelly file',
    run: ({ mod, expect }) => {
      const analyzeTestFile = getAnalyzer({ mod });
      const result = analyzeTestFile(SMELLY_FILE);
      expect(result.tests).to.have.length(4);
      expect(result.tests.map((t) => t.name)).to.deep.equal([
        'renders',
        'updates quantity',
        'matches snapshot A',
        'matches snapshot B',
      ]);
    },
  },
  {
    name: '"renders" is flagged tautology (expect(true).toBe(true)) and mocks-subject',
    run: ({ mod, expect }) => {
      const analyzeTestFile = getAnalyzer({ mod });
      const result = analyzeTestFile(SMELLY_FILE);
      const t = findTest(result, 'renders');
      expect(t.smells).to.include('tautology');
      expect(t.smells).to.include('mocks-subject');
      expect(t.smells).to.not.include('no-assertion');
    },
  },
  {
    name: '"updates quantity" is flagged no-assertion and implementation-detail',
    run: ({ mod, expect }) => {
      const analyzeTestFile = getAnalyzer({ mod });
      const result = analyzeTestFile(SMELLY_FILE);
      const t = findTest(result, 'updates quantity');
      expect(t.smells).to.include('no-assertion');
      expect(t.smells).to.include('implementation-detail');
      expect(t.smells).to.not.include('tautology');
    },
  },
  {
    name: 'both snapshot tests are flagged snapshot-overuse once the file has more than one snapshot call',
    run: ({ mod, expect }) => {
      const analyzeTestFile = getAnalyzer({ mod });
      const result = analyzeTestFile(SMELLY_FILE);
      expect(findTest(result, 'snapshot A').smells).to.include('snapshot-overuse');
      expect(findTest(result, 'snapshot B').smells).to.include('snapshot-overuse');
    },
  },
  {
    name: 'summary flags vi.mock of the subject and the missing negative case',
    run: ({ mod, expect }) => {
      const analyzeTestFile = getAnalyzer({ mod });
      const result = analyzeTestFile(SMELLY_FILE);
      const joined = result.summary.join(' ').toLowerCase();
      expect(joined).to.match(/vi\.mock|mock/);
      expect(joined).to.match(/negative/);
    },
  },
  {
    name: 'the smelly file scores well under 50, the clean file scores 90 or above',
    run: ({ mod, expect }) => {
      const analyzeTestFile = getAnalyzer({ mod });
      const smelly = analyzeTestFile(SMELLY_FILE);
      const clean = analyzeTestFile(CLEAN_FILE);
      expect(smelly.score).to.be.lessThan(50);
      expect(smelly.score).to.be.at.least(0);
      expect(clean.score).to.be.at.least(90);
    },
  },
  {
    name: 'the clean file has no tautology, no-assertion, implementation-detail, snapshot-overuse, or mocks-subject smells',
    run: ({ mod, expect }) => {
      const analyzeTestFile = getAnalyzer({ mod });
      const clean = analyzeTestFile(CLEAN_FILE);
      for (const t of clean.tests) {
        expect(t.smells).to.not.include('tautology');
        expect(t.smells).to.not.include('no-assertion');
        expect(t.smells).to.not.include('implementation-detail');
        expect(t.smells).to.not.include('snapshot-overuse');
        expect(t.smells).to.not.include('mocks-subject');
      }
    },
  },
  {
    name: 'a skipped test is flagged, and score reflects it',
    run: ({ mod, expect }) => {
      const analyzeTestFile = getAnalyzer({ mod });
      const source = `import { it, expect } from 'vitest';

it.skip('does something later', () => {
  expect(1).toBe(1);
});

it('works now', () => {
  expect(2 + 2).toBe(4);
});
`;
      const result = analyzeTestFile(source);
      const skipped = findTest(result, 'does something later');
      expect(skipped.smells).to.include('skipped');
      expect(skipped.smells).to.include('tautology');
      expect(result.score).to.be.lessThan(100);
    },
  },
];
