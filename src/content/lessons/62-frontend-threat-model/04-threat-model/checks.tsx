import type { Check } from '../../../types';

type StrideCategory =
  | 'Spoofing'
  | 'Tampering'
  | 'Repudiation'
  | 'Information Disclosure'
  | 'Denial of Service'
  | 'Elevation of Privilege';

type Feature = {
  assets: string[];
  entryPoints: { id: string; label: string }[];
  trustBoundaries: string[];
  thirdParty: string[];
};

type Threat = {
  entryPointId: string;
  category: StrideCategory;
  control: string;
  likelihood: 1 | 2 | 3;
  impact: 1 | 2 | 3;
  risk: number;
};

const feature: Feature = {
  assets: ['session token', 'payment intent id'],
  entryPoints: [
    { id: 'ep-checkout-url', label: 'checkout return URL param' },
    { id: 'ep-widget', label: 'postMessage from support widget' },
    { id: 'ep-avatar', label: 'file upload for receipt image' },
    { id: 'ep-comment', label: 'comment form' },
  ],
  trustBoundaries: ['client parses the widget message'],
  thirdParty: ['third-party script (chat widget)'],
};

export const checks: Check[] = [
  {
    name: 'threatModel: a postMessage entry point produces a Spoofing threat suggesting origin validation',
    run: async ({ mod, expect }) => {
      const threatModel = mod.threatModel as (f: Feature) => Threat[];
      const threats = threatModel(feature);
      const widgetThreat = threats.find((t) => t.entryPointId === 'ep-widget');
      expect(widgetThreat, 'expected a threat for the postMessage entry point').to.exist;
      expect(widgetThreat!.category).to.equal('Spoofing');
      expect(widgetThreat!.control.toLowerCase()).to.include('origin');
    },
  },
  {
    name: 'threatModel: a third-party script produces a Tampering threat suggesting SRI/CSP',
    run: async ({ mod, expect }) => {
      const threatModel = mod.threatModel as (f: Feature) => Threat[];
      const threats = threatModel(feature);
      const thirdPartyThreat = threats.find((t) => t.entryPointId === 'third-party script (chat widget)');
      expect(thirdPartyThreat, 'expected a threat for the third-party script').to.exist;
      expect(thirdPartyThreat!.category).to.equal('Tampering');
      expect(thirdPartyThreat!.control.toLowerCase()).to.match(/integrity|csp/);
    },
  },
  {
    name: 'threatModel: a URL-shaped entry point is flagged even though "URL" is only part of the label',
    run: async ({ mod, expect }) => {
      const threatModel = mod.threatModel as (f: Feature) => Threat[];
      const threats = threatModel(feature);
      const urlThreat = threats.find((t) => t.entryPointId === 'ep-checkout-url');
      expect(urlThreat, 'a substring match on "url" should catch "checkout return URL param"').to.exist;
    },
  },
  {
    name: 'threatModel: results are ranked by risk, highest first',
    run: async ({ mod, expect }) => {
      const threatModel = mod.threatModel as (f: Feature) => Threat[];
      const threats = threatModel(feature);
      expect(threats.length).to.be.greaterThan(1);
      for (let i = 1; i < threats.length; i++) {
        expect(threats[i - 1]!.risk).to.be.at.least(threats[i]!.risk);
      }
      // the highest risk entries (risk 6: likelihood 2 x impact 3) should come before
      // the lowest-risk entries produced by this fixture
      const topRisk = threats[0]!.risk;
      expect(topRisk).to.equal(6);
    },
  },
  {
    name: 'threatModel: an entry point with no matching rule contributes no threats, and every risk equals likelihood times impact',
    run: async ({ mod, expect }) => {
      const threatModel = mod.threatModel as (f: Feature) => Threat[];
      const threats = threatModel(feature);
      for (const t of threats) {
        expect(t.risk).to.equal(t.likelihood * t.impact);
      }
      const unrelated = threatModel({
        assets: ['nothing sensitive'],
        entryPoints: [{ id: 'ep-nothing', label: 'static marketing copy' }],
        trustBoundaries: [],
        thirdParty: [],
      });
      expect(unrelated).to.deep.equal([]);
    },
  },
];
