import type { Check } from '../../../types';

type FakeClock = { now(): number; sleep(ms: number): Promise<void> };
type IsVisible = (el: Element) => boolean;
type Mod = {
  expectEventually: (predicate: () => true | string, opts: { timeout: number; interval: number; clock: FakeClock }) => Promise<void>;
  actionable: (el: Element, clock: FakeClock, isVisible: IsVisible, opts?: { timeout?: number; interval?: number }) => Promise<Element>;
};

function createFakeClock(onTick?: (elapsed: number, tickCount: number) => void): FakeClock {
  let time = 0;
  let tickCount = 0;
  return {
    now: () => time,
    async sleep(ms: number) {
      time += ms;
      tickCount += 1;
      onTick?.(time, tickCount);
      await Promise.resolve();
      await Promise.resolve();
    },
  };
}

export const checks: Check[] = [
  {
    name: 'expectEventually resolves immediately, without sleeping, when the predicate is already true',
    run: async ({ mod, expect }) => {
      const { expectEventually } = mod as unknown as Mod;
      const clock = createFakeClock();
      await expectEventually(() => true, { timeout: 1000, interval: 50, clock });
      expect(clock.now(), 'should not have advanced the clock at all').to.equal(0);
    },
  },
  {
    name: 'expectEventually polls on the given interval and resolves once the predicate flips true',
    run: async ({ mod, expect }) => {
      const { expectEventually } = mod as unknown as Mod;
      let ticks = 0;
      const clock = createFakeClock(() => {
        ticks += 1;
      });
      await expectEventually(() => (ticks >= 3 ? true : `only ${ticks} ticks so far`), {
        timeout: 1000,
        interval: 20,
        clock,
      });
      expect(clock.now()).to.equal(60); // 3 sleeps of 20ms each
    },
  },
  {
    name: 'expectEventually times out and reports the last failure message',
    run: async ({ mod, expect }) => {
      const { expectEventually } = mod as unknown as Mod;
      const clock = createFakeClock();
      let error: Error | undefined;
      try {
        await expectEventually(() => 'still loading', { timeout: 100, interval: 20, clock });
      } catch (err) {
        error = err as Error;
      }
      expect(error, 'should have thrown').to.exist;
      expect(error!.message).to.match(/timed out after 100ms/);
      expect(error!.message).to.match(/still loading/);
    },
  },
  {
    name: 'actionable resolves once visible, enabled, and stable all hold at the same time',
    run: async ({ mod, expect }) => {
      const { actionable } = mod as unknown as Mod;
      const el = document.createElement('button');
      el.setAttribute('data-position', '0'); // never moves in this check
      el.setAttribute('disabled', ''); // starts disabled, and hidden
      let visible = false;
      const clock = createFakeClock((_elapsed, tickCount) => {
        if (tickCount >= 1) visible = true;
        if (tickCount >= 2) el.removeAttribute('disabled');
      });
      const result = await actionable(el, clock, () => visible, { timeout: 1000, interval: 10 });
      expect(result).to.equal(el);
      expect(visible).to.equal(true);
      expect(el.hasAttribute('disabled')).to.equal(false);
    },
  },
  {
    name: 'actionable keeps waiting while data-position is still changing, then resolves once it settles',
    run: async ({ mod, expect }) => {
      const { actionable } = mod as unknown as Mod;
      const el = document.createElement('div');
      el.setAttribute('data-position', '0');
      const clock = createFakeClock((_elapsed, tickCount) => {
        if (tickCount <= 3) el.setAttribute('data-position', String(tickCount));
        // after tick 3, position stops changing (settles at "3")
      });
      const before = clock.now();
      await actionable(el, clock, () => true, { timeout: 1000, interval: 10 });
      expect(clock.now()).to.be.greaterThan(before);
      expect(el.getAttribute('data-position')).to.equal('3');
    },
  },
  {
    name: 'actionable times out with a message naming what was still failing, when nothing ever settles',
    run: async ({ mod, expect }) => {
      const { actionable } = mod as unknown as Mod;
      const el = document.createElement('div');
      el.setAttribute('data-position', '0');
      let counter = 0;
      const clock = createFakeClock(() => {
        counter += 1;
        el.setAttribute('data-position', String(counter)); // always moving, never settles
      });
      let error: Error | undefined;
      try {
        await actionable(el, clock, () => true, { timeout: 100, interval: 20 });
      } catch (err) {
        error = err as Error;
      }
      expect(error, 'should have timed out').to.exist;
      expect(error!.message).to.match(/stable/);
    },
  },
];
