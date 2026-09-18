import type { Check } from '../../../types';

type ShiftEntry = { startTime: number; value: number; hadRecentInput: boolean };
type LcpCandidate = { size: number; renderTime: number };
type LoafEntry = { scripts: Array<{ name: string; duration: number }> };

export const checks: Check[] = [
  {
    name: 'clsFromShifts sums shifts within a 500ms gap into one session',
    run: async ({ mod, expect }) => {
      const clsFromShifts = mod.clsFromShifts as (shifts: ShiftEntry[]) => number;
      const shifts: ShiftEntry[] = [
        { startTime: 0, value: 0.05, hadRecentInput: false },
        { startTime: 400, value: 0.05, hadRecentInput: false },
      ];
      expect(clsFromShifts(shifts)).to.be.closeTo(0.1, 0.0001);
    },
  },
  {
    name: 'clsFromShifts starts a new session when the gap exceeds 1000ms, and reports the worst session',
    run: async ({ mod, expect }) => {
      const clsFromShifts = mod.clsFromShifts as (shifts: ShiftEntry[]) => number;
      const shifts: ShiftEntry[] = [
        { startTime: 0, value: 0.05, hadRecentInput: false },
        { startTime: 400, value: 0.05, hadRecentInput: false }, // session 1: 0.10
        { startTime: 2000, value: 0.2, hadRecentInput: false }, // gap 1600ms -> session 2
        { startTime: 2300, value: 0.2, hadRecentInput: false }, // session 2: 0.40
      ];
      expect(clsFromShifts(shifts)).to.be.closeTo(0.4, 0.0001);
    },
  },
  {
    name: 'clsFromShifts starts a new session once the running window would exceed 5000ms, even with small gaps',
    run: async ({ mod, expect }) => {
      const clsFromShifts = mod.clsFromShifts as (shifts: ShiftEntry[]) => number;
      // Five shifts, 900ms apart (under the 1000ms gap limit), spanning 0..3600ms: one session, total 0.5.
      const shifts: ShiftEntry[] = Array.from({ length: 5 }, (_, i) => ({
        startTime: i * 900,
        value: 0.1,
        hadRecentInput: false,
      }));
      expect(clsFromShifts(shifts)).to.be.closeTo(0.5, 0.0001);
    },
  },
  {
    name: 'clsFromShifts ignores entries with hadRecentInput',
    run: async ({ mod, expect }) => {
      const clsFromShifts = mod.clsFromShifts as (shifts: ShiftEntry[]) => number;
      const shifts: ShiftEntry[] = [
        { startTime: 0, value: 0.05, hadRecentInput: false },
        { startTime: 100, value: 5, hadRecentInput: true }, // huge, but must be ignored
      ];
      expect(clsFromShifts(shifts)).to.be.closeTo(0.05, 0.0001);
    },
  },
  {
    name: 'lcpCandidateResolution picks the largest candidate rendered before the first interaction',
    run: async ({ mod, expect }) => {
      const lcpCandidateResolution = mod.lcpCandidateResolution as (
        entries: LcpCandidate[],
        firstInteractionAt: number,
      ) => number;
      const entries: LcpCandidate[] = [
        { size: 1000, renderTime: 200 },
        { size: 5000, renderTime: 900 },
        { size: 9000, renderTime: 4000 }, // after the interaction, must be excluded
      ];
      expect(lcpCandidateResolution(entries, 3000)).to.equal(900);
    },
  },
  {
    name: 'lcpCandidateResolution breaks a size tie by the later renderTime',
    run: async ({ mod, expect }) => {
      const lcpCandidateResolution = mod.lcpCandidateResolution as (
        entries: LcpCandidate[],
        firstInteractionAt: number,
      ) => number;
      const entries: LcpCandidate[] = [
        { size: 4800, renderTime: 1100 },
        { size: 4800, renderTime: 1900 },
      ];
      expect(lcpCandidateResolution(entries, 5000)).to.equal(1900);
    },
  },
  {
    name: 'lcpCandidateResolution returns 0 when nothing qualifies before the first interaction',
    run: async ({ mod, expect }) => {
      const lcpCandidateResolution = mod.lcpCandidateResolution as (
        entries: LcpCandidate[],
        firstInteractionAt: number,
      ) => number;
      expect(lcpCandidateResolution([{ size: 100, renderTime: 500 }], 200)).to.equal(0);
    },
  },
  {
    name: 'attributeLongTask sums a script’s duration across multiple LoAF entries',
    run: async ({ mod, expect }) => {
      const attributeLongTask = mod.attributeLongTask as (entries: LoafEntry[]) => string | null;
      const entries: LoafEntry[] = [
        { scripts: [{ name: 'analytics.js', duration: 40 }, { name: 'app.js', duration: 30 }] },
        { scripts: [{ name: 'analytics.js', duration: 45 }] },
      ];
      // analytics.js: 40 + 45 = 85, app.js: 30 -> analytics.js wins.
      expect(attributeLongTask(entries)).to.equal('analytics.js');
    },
  },
  {
    name: 'attributeLongTask returns null for an empty input',
    run: async ({ mod, expect }) => {
      const attributeLongTask = mod.attributeLongTask as (entries: LoafEntry[]) => string | null;
      expect(attributeLongTask([])).to.equal(null);
    },
  },
  {
    name: 'the rendered App shows the CLS session score, final LCP, and long task culprit',
    run: async ({ render, screen, expect, act, Component }) => {
      await act(async () => {
        render(<Component />);
      });
      expect(screen.getByTestId('cls').textContent).to.include('0.20');
      expect(screen.getByTestId('lcp').textContent).to.include('1900');
      expect(screen.getByTestId('culprit').textContent).to.include('analytics.js');
    },
  },
];
