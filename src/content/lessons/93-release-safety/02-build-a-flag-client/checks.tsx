import type { Check } from '../../../types';

type EvalResult = { value: boolean; reason: string };
type FlagClientModule = {
  createFlagClient: (config: { flags: unknown[]; context: { userId: string; attributes?: Record<string, unknown> } }) => {
    evaluate: (key: string) => EvalResult;
    update: (partial: Record<string, unknown>) => void;
    subscribe: (listener: () => void) => () => void;
  };
  FlagProvider: React.ComponentType<{ client: unknown; children: React.ReactNode }>;
  useFlag: (key: string) => EvalResult;
};

export const checks: Check[] = [
  {
    name: 'kill switch overrides matching rules and an in-bucket rollout',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { createFlagClient } = mod as unknown as FlagClientModule;
      const client = createFlagClient({
        flags: [
          {
            key: 'risky',
            defaultValue: false,
            killSwitch: true,
            rules: [{ if: { plan: 'pro' }, serve: true }],
            rollout: { percentage: 100 },
          },
        ],
        context: { userId: 'u1', attributes: { plan: 'pro' } },
      });
      expect(client.evaluate('risky')).to.deep.equal({ value: false, reason: 'kill-switch' });
    },
  },
  {
    name: 'the first matching rule wins, in array order, over rollout and default',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { createFlagClient } = mod as unknown as FlagClientModule;
      const client = createFlagClient({
        flags: [
          {
            key: 'beta-ui',
            defaultValue: false,
            rules: [
              { if: { plan: 'pro' }, serve: true },
              { if: { plan: 'free' }, serve: false },
            ],
            rollout: { percentage: 100 },
          },
        ],
        context: { userId: 'u1', attributes: { plan: 'free' } },
      });
      expect(client.evaluate('beta-ui')).to.deep.equal({ value: false, reason: 'rule' });
    },
  },
  {
    name: "a rule only matches when every one of its attributes equals the context's",
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { createFlagClient } = mod as unknown as FlagClientModule;
      const client = createFlagClient({
        flags: [
          {
            key: 'beta-ui',
            defaultValue: false,
            rules: [{ if: { plan: 'free', betaOptIn: true }, serve: true }],
          },
        ],
        // plan matches but betaOptIn is absent from attributes, so the rule must not match
        context: { userId: 'u1', attributes: { plan: 'free' } },
      });
      expect(client.evaluate('beta-ui')).to.deep.equal({ value: false, reason: 'default' });
    },
  },
  {
    name: 'a 0% rollout still reports reason "rollout", not a fallthrough to "default"',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { createFlagClient } = mod as unknown as FlagClientModule;
      const client = createFlagClient({
        flags: [{ key: 'new-thing', defaultValue: true, rollout: { percentage: 0 } }],
        context: { userId: 'anyone' },
      });
      expect(client.evaluate('new-thing')).to.deep.equal({ value: false, reason: 'rollout' });
    },
  },
  {
    name: 'a 100% rollout puts every user in',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { createFlagClient } = mod as unknown as FlagClientModule;
      const client = createFlagClient({
        flags: [{ key: 'new-thing', defaultValue: false, rollout: { percentage: 100 } }],
        context: { userId: 'whoever' },
      });
      expect(client.evaluate('new-thing')).to.deep.equal({ value: true, reason: 'rollout' });
    },
  },
  {
    name: 'evaluating a key with no matching flag definition returns reason "missing"',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { createFlagClient } = mod as unknown as FlagClientModule;
      const client = createFlagClient({ flags: [], context: { userId: 'u1' } });
      expect(client.evaluate('does-not-exist')).to.deep.equal({ value: false, reason: 'missing' });
    },
  },
  {
    name: 'rollout bucketing is deterministic: the same user gets the same result every call',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { createFlagClient } = mod as unknown as FlagClientModule;
      const client = createFlagClient({
        flags: [{ key: 'sticky', defaultValue: false, rollout: { percentage: 50 } }],
        context: { userId: 'stable-user-42' },
      });
      const first = client.evaluate('sticky');
      for (let i = 0; i < 10; i++) {
        expect(client.evaluate('sticky')).to.deep.equal(first);
      }
    },
  },
  {
    name: 'changing the rollout salt changes at least some users’ bucket assignment',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { createFlagClient } = mod as unknown as FlagClientModule;
      let differences = 0;
      for (let i = 0; i < 100; i++) {
        const userId = `salt-check-${i}`;
        const a = createFlagClient({
          flags: [{ key: 'k', defaultValue: false, rollout: { percentage: 50, salt: 'v1' } }],
          context: { userId },
        }).evaluate('k');
        const b = createFlagClient({
          flags: [{ key: 'k', defaultValue: false, rollout: { percentage: 50, salt: 'v2' } }],
          context: { userId },
        }).evaluate('k');
        if (a.value !== b.value) differences++;
      }
      expect(differences, 'expected a different salt to flip at least some of 100 users').to.be.greaterThan(0);
    },
  },
  {
    name: 'a percentage rollout distributes ~1000 synthetic users within 5 points of the target',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { createFlagClient } = mod as unknown as FlagClientModule;
      const targetPercentage = 30;
      const client = createFlagClient({
        flags: [{ key: 'rollout-check', defaultValue: false, rollout: { percentage: targetPercentage } }],
        context: { userId: 'placeholder' },
      });
      let inCount = 0;
      const total = 1000;
      for (let i = 0; i < total; i++) {
        client.update({ userId: `synthetic-user-${i}` });
        if (client.evaluate('rollout-check').value) inCount++;
      }
      const observedPercentage = (inCount / total) * 100;
      expect(Math.abs(observedPercentage - targetPercentage), `observed ${observedPercentage}%`).to.be.lessThan(5);
    },
  },
  {
    name: 'useFlag re-renders a component when client.update changes which rule matches',
    run: async (ctx) => {
      const { render, screen, act, expect, mod } = ctx;
      const { createFlagClient, FlagProvider, useFlag } = mod as unknown as FlagClientModule;
      const client = createFlagClient({
        flags: [{ key: 'beta', defaultValue: false, rules: [{ if: { cohort: 'beta' }, serve: true }] }],
        context: { userId: 'u1', attributes: { cohort: 'control' } },
      });

      function Probe() {
        const { value } = useFlag('beta');
        return <div data-testid="probe">{value ? 'on' : 'off'}</div>;
      }

      render(
        <FlagProvider client={client}>
          <Probe />
        </FlagProvider>,
      );
      expect(screen.getByTestId('probe').textContent).to.equal('off');

      await act(async () => {
        client.update({ attributes: { cohort: 'beta' } });
      });
      expect(screen.getByTestId('probe').textContent).to.equal('on');
    },
  },
];
