export type RSCSupport = 'stable' | 'unstable' | 'none';

export type FrameworkProfile = {
  name: string;
  rsc: RSCSupport;
  ssg: boolean;
  edge: boolean;
  typedRoutes: boolean;
  vendorNeutral: boolean;
  maturity: number; // 1 (brand new) .. 5 (long-stable API)
  learningCurve: number; // 1 (gentle) .. 5 (steep)
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

export function scoreFrameworks(requirements: Requirements, catalog: FrameworkProfile[]): ScoreOutcome {
  // TODO: eliminate frameworks that fail a hard constraint, then score and
  // rank the rest. See prompt.md for the exact normalization formulas.
  return {
    ranked: catalog.map((f) => ({ name: f.name, score: 0, contributions: {} })),
    eliminated: [],
  };
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
