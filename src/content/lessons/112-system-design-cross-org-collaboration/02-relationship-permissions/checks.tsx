import type { Check } from '../../../types';

type Tuple = { object: string; relation: string; subject: string };
type Schema = Record<string, Record<string, { union?: string[]; parent?: { relation: string; via: string } }>>;
type Task = { id: string; programId: string; ownerOrg: string; visibility: 'program' | 'org-internal' };

type Mod = {
  check: (schema: Schema, tuples: Tuple[], subject: string, relation: string, object: string) => boolean;
  expand: (schema: Schema, tuples: Tuple[], relation: string, object: string) => string[];
  visibleTasks: (tuples: Tuple[], schema: Schema, user: string, tasks: Task[]) => Task[];
};

const schema: Schema = {
  program: {
    owner: {},
    editor: { union: ['owner'] },
    viewer: { union: ['editor'], parent: { relation: 'org', via: 'member' } },
  },
  org: {
    member: {},
  },
};

const tuples: Tuple[] = [
  // Direct tuples
  { object: 'program:1', relation: 'owner', subject: 'user:1' }, // Priya, customer PM
  { object: 'program:1', relation: 'editor', subject: 'user:5' }, // Sam, partner QA lead

  // Parent inheritance: customer org's members inherit viewer via the program's 'org' relation
  { object: 'program:1', relation: 'org', subject: 'org:1' },
  { object: 'org:1', relation: 'member', subject: 'user:1' },
  { object: 'org:1', relation: 'member', subject: 'user:2' }, // Dana, customer engineer

  // Userset subject: vendor A's members are granted viewer directly, no 'org' link needed
  { object: 'program:1', relation: 'viewer', subject: 'org:2#member' },
  { object: 'org:2', relation: 'member', subject: 'user:3' }, // Wei, vendor A engineer

  // Vendor B: membership exists, but the program share was revoked (no tuple links org:3 to program:1)
  { object: 'org:3', relation: 'member', subject: 'user:4' }, // Alex, vendor B engineer

  // A cyclic userset, reachable only through a dead end — must resolve to false, and terminate
  { object: 'program:1', relation: 'viewer', subject: 'org:5#member' },
  { object: 'org:5', relation: 'member', subject: 'org:6#member' },
  { object: 'org:6', relation: 'member', subject: 'org:5#member' },
];

const tasks: Task[] = [
  { id: 't1', programId: '1', ownerOrg: '1', visibility: 'program' },
  { id: 't2', programId: '1', ownerOrg: '1', visibility: 'org-internal' },
  { id: 't3', programId: '1', ownerOrg: '2', visibility: 'program' },
  { id: 't4', programId: '1', ownerOrg: '2', visibility: 'org-internal' },
];

export const checks: Check[] = [
  {
    name: 'the program owner is a viewer through the editor/owner union chain',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { check } = mod as unknown as Mod;
      expect(check(schema, tuples, 'user:1', 'viewer', 'program:1')).to.equal(true);
      expect(check(schema, tuples, 'user:1', 'editor', 'program:1')).to.equal(true);
    },
  },
  {
    name: 'a direct editor tuple grants viewer through the union, without an owner tuple',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { check } = mod as unknown as Mod;
      expect(check(schema, tuples, 'user:5', 'viewer', 'program:1')).to.equal(true);
      expect(check(schema, tuples, 'user:5', 'owner', 'program:1')).to.equal(false);
    },
  },
  {
    name: 'parent inheritance: a customer org member is a viewer via the program-to-org link',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { check } = mod as unknown as Mod;
      expect(check(schema, tuples, 'user:2', 'viewer', 'program:1')).to.equal(true);
    },
  },
  {
    name: 'userset subject: a vendor org member is a viewer through a direct org#member tuple',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { check } = mod as unknown as Mod;
      expect(check(schema, tuples, 'user:3', 'viewer', 'program:1')).to.equal(true);
      expect(check(schema, tuples, 'user:3', 'editor', 'program:1')).to.equal(false);
    },
  },
  {
    name: 'a revoked (never-granted) share denies access even though org membership exists',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { check } = mod as unknown as Mod;
      expect(check(schema, tuples, 'user:4', 'viewer', 'program:1')).to.equal(false);
    },
  },
  {
    name: 'a cyclic userset with no concrete member resolves to false and terminates',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { check } = mod as unknown as Mod;
      expect(check(schema, tuples, 'user:9', 'viewer', 'program:1')).to.equal(false);
    },
  },
  {
    name: 'expand lists every concrete viewer of the program, sorted, with no userset strings',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { expand } = mod as unknown as Mod;
      expect(expand(schema, tuples, 'viewer', 'program:1')).to.deep.equal(['user:1', 'user:2', 'user:3', 'user:5']);
    },
  },
  {
    name: 'visibleTasks: a customer org member sees program-wide tasks plus their own org-internal ones',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { visibleTasks } = mod as unknown as Mod;
      const result = visibleTasks(tuples, schema, 'user:2', tasks);
      expect(result.map((t) => t.id)).to.deep.equal(['t1', 't2', 't3']);
    },
  },
  {
    name: 'visibleTasks: a vendor org member sees program-wide tasks plus their own org-internal ones, not the customer’s',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { visibleTasks } = mod as unknown as Mod;
      const result = visibleTasks(tuples, schema, 'user:3', tasks);
      expect(result.map((t) => t.id)).to.deep.equal(['t1', 't3', 't4']);
    },
  },
  {
    name: 'visibleTasks: a user with no program access sees nothing, regardless of task visibility',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { visibleTasks } = mod as unknown as Mod;
      const result = visibleTasks(tuples, schema, 'user:4', tasks);
      expect(result).to.deep.equal([]);
    },
  },
];
