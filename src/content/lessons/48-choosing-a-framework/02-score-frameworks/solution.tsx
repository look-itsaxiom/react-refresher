export type RSCSupport = 'stable' | 'unstable' | 'none';

export type FrameworkProfile = {
  name: string;
  rsc: RSCSupport;
  ssg: boolean;
  edge: boolean;
  typedRoutes: boolean;
  vendorNeutral: boolean;
  maturity: number;
  learningCurve: number;
};

export type CriterionKey =
  | 'rsc'
  | 'ssg'
  | 'edge'
  | 'typedRoutes'
  | 'vendorNeutral'
  | 'maturity'
  | 'learningCurve';

export type Weights = Partial<Record<CriterionKey, number>>;

export type HardConstraints = {
  rsc?: RSCSupport[];
  ssg?: boolean;
  edge?: boolean;
  typedRoutes?: boolean;
  vendorNeutral?: boolean;
  minMaturity?: number;
  maxLearningCurve?: number;
};

export type Requirements = {
  weights: Weights;
  hardConstraints?: HardConstraints;
};

export type ScoredFramework = {
  name: string;
  score: number;
  contributions: Partial<Record<CriterionKey, number>>;
};

export type Elimination = { name: string; reasons: string[] };

export type ScoreOutcome = {
  ranked: ScoredFramework[];
  eliminated: Elimination[];
};

function checkHardConstraints(f: FrameworkProfile, hc: HardConstraints | undefined): string[] {
  if (!hc) return [];
  const reasons: string[] = [];

  if (hc.rsc !== undefined && !hc.rsc.includes(f.rsc)) {
    reasons.push(`rsc is "${f.rsc}", requires one of: ${hc.rsc.join(', ')}`);
  }
  if (hc.ssg === true && f.ssg !== true) {
    reasons.push('ssg is false, required true');
  }
  if (hc.edge === true && f.edge !== true) {
    reasons.push('edge is false, required true');
  }
  if (hc.typedRoutes === true && f.typedRoutes !== true) {
    reasons.push('typedRoutes is false, required true');
  }
  if (hc.vendorNeutral === true && f.vendorNeutral !== true) {
    reasons.push('vendorNeutral is false, required true');
  }
  if (hc.minMaturity !== undefined && f.maturity < hc.minMaturity) {
    reasons.push(`maturity ${f.maturity} is below minimum ${hc.minMaturity}`);
  }
  if (hc.maxLearningCurve !== undefined && f.learningCurve > hc.maxLearningCurve) {
    reasons.push(`learningCurve ${f.learningCurve} exceeds maximum ${hc.maxLearningCurve}`);
  }

  return reasons;
}

function normalize(key: CriterionKey, f: FrameworkProfile): number {
  switch (key) {
    case 'rsc':
      return f.rsc === 'stable' ? 1 : f.rsc === 'unstable' ? 0.5 : 0;
    case 'ssg':
      return f.ssg ? 1 : 0;
    case 'edge':
      return f.edge ? 1 : 0;
    case 'typedRoutes':
      return f.typedRoutes ? 1 : 0;
    case 'vendorNeutral':
      return f.vendorNeutral ? 1 : 0;
    case 'maturity':
      return (f.maturity - 1) / 4;
    case 'learningCurve':
      return (5 - f.learningCurve) / 4;
  }
}

export function scoreFrameworks(requirements: Requirements, catalog: FrameworkProfile[]): ScoreOutcome {
  const eliminated: Elimination[] = [];
  const survivors: FrameworkProfile[] = [];

  for (const f of catalog) {
    const reasons = checkHardConstraints(f, requirements.hardConstraints);
    if (reasons.length > 0) {
      eliminated.push({ name: f.name, reasons });
    } else {
      survivors.push(f);
    }
  }

  const weightEntries = Object.entries(requirements.weights).filter(
    ([, weight]) => weight !== undefined,
  ) as [CriterionKey, number][];

  const ranked: ScoredFramework[] = survivors.map((f) => {
    const contributions: Partial<Record<CriterionKey, number>> = {};
    let score = 0;
    for (const [key, weight] of weightEntries) {
      const contribution = weight * normalize(key, f);
      contributions[key] = contribution;
      score += contribution;
    }
    return { name: f.name, score, contributions };
  });

  ranked.sort((a, b) => {
    if (Math.abs(a.score - b.score) < 1e-9) return a.name.localeCompare(b.name);
    return b.score - a.score;
  });

  return { ranked, eliminated };
}

const sampleCatalog: FrameworkProfile[] = [
  { name: 'Next.js', rsc: 'stable', ssg: true, edge: true, typedRoutes: true, vendorNeutral: false, maturity: 5, learningCurve: 4 },
  { name: 'React Router', rsc: 'unstable', ssg: true, edge: true, typedRoutes: true, vendorNeutral: true, maturity: 4, learningCurve: 3 },
  { name: 'TanStack Start', rsc: 'none', ssg: true, edge: true, typedRoutes: true, vendorNeutral: true, maturity: 2, learningCurve: 3 },
];

const sampleRequirements: Requirements = {
  weights: { rsc: 3, typedRoutes: 2, vendorNeutral: 2, maturity: 1 },
  hardConstraints: { minMaturity: 2 },
};

export default function App() {
  const result = scoreFrameworks(sampleRequirements, sampleCatalog);
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 16 }}>
      <h3>Ranked</h3>
      <ol>
        {result.ranked.map((r) => (
          <li key={r.name}>
            {r.name} — {r.score.toFixed(2)}
          </li>
        ))}
      </ol>
      <h3>Eliminated</h3>
      <ul>
        {result.eliminated.map((e) => (
          <li key={e.name}>
            {e.name}: {e.reasons.join('; ')}
          </li>
        ))}
      </ul>
    </div>
  );
}
