import { createElement } from 'react';
import type { Check } from '../../../types';

type Mod = {
  canCrossBoundary: (value: unknown) => boolean;
  asServerFunction: <T extends (...args: never[]) => unknown>(fn: T) => T;
  asClientReference: <T extends (...args: never[]) => unknown>(fn: T) => T;
};

export const checks: Check[] = [
  {
    name: 'primitives (string, number, boolean, bigint, undefined, null) all cross',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { canCrossBoundary } = mod as unknown as Mod;
      expect(canCrossBoundary('hello')).to.equal(true);
      expect(canCrossBoundary(42)).to.equal(true);
      expect(canCrossBoundary(true)).to.equal(true);
      expect(canCrossBoundary(10n)).to.equal(true);
      expect(canCrossBoundary(undefined)).to.equal(true);
      expect(canCrossBoundary(null)).to.equal(true);
    },
  },
  {
    name: 'a globally-registered symbol crosses; a local symbol does not',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { canCrossBoundary } = mod as unknown as Mod;
      expect(canCrossBoundary(Symbol.for('shared-key'))).to.equal(true);
      expect(canCrossBoundary(Symbol('local'))).to.equal(false);
    },
  },
  {
    name: 'Date, Map, Set, and a Uint8Array all cross; a Map with a bad value does not',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { canCrossBoundary } = mod as unknown as Mod;
      expect(canCrossBoundary(new Date())).to.equal(true);
      expect(canCrossBoundary(new Map([['a', 1]]))).to.equal(true);
      expect(canCrossBoundary(new Set([1, 2, 3]))).to.equal(true);
      expect(canCrossBoundary(new Uint8Array([1, 2, 3]))).to.equal(true);
      expect(canCrossBoundary(new Map([['a', () => {}]]))).to.equal(false);
    },
  },
  {
    name: 'a Promise and a JSX element both cross',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { canCrossBoundary } = mod as unknown as Mod;
      expect(canCrossBoundary(Promise.resolve(1))).to.equal(true);
      expect(canCrossBoundary(createElement('div', null, 'hi'))).to.equal(true);
    },
  },
  {
    name: 'an unmarked function does not cross; a marked server function or client reference does',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { canCrossBoundary, asServerFunction, asClientReference } = mod as unknown as Mod;
      expect(canCrossBoundary(() => 'plain')).to.equal(false);
      expect(canCrossBoundary(asServerFunction(() => 'server'))).to.equal(true);
      expect(canCrossBoundary(asClientReference(() => 'client'))).to.equal(true);
    },
  },
  {
    name: 'class instances and null-prototype objects do not cross; a matching plain object does',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { canCrossBoundary } = mod as unknown as Mod;
      class Point {
        constructor(public x: number, public y: number) {}
      }
      expect(canCrossBoundary(new Point(1, 2))).to.equal(false);
      expect(canCrossBoundary(Object.create(null))).to.equal(false);
      expect(canCrossBoundary({ x: 1, y: 2 })).to.equal(true);
    },
  },
  {
    name: 'a plain object or array is only valid if every nested value is valid',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { canCrossBoundary } = mod as unknown as Mod;
      expect(canCrossBoundary({ name: 'Ada', tags: ['a', 'b'], meta: { born: new Date() } })).to.equal(true);
      expect(canCrossBoundary({ name: 'Ada', onClick: () => {} })).to.equal(false);
      expect(canCrossBoundary([1, 2, Symbol('nope')])).to.equal(false);
    },
  },
];
