export type Tuple = {
  object: string;
  relation: string;
  subject: string;
};

export type Schema = Record<
  string,
  Record<
    string,
    {
      union?: string[];
      parent?: { relation: string; via: string };
    }
  >
>;

// TODO: implement check() — see prompt.md for the resolution order
// (direct tuples, unions, parent inheritance) and the cycle/depth guard.
export function check(
  schema: Schema,
  tuples: Tuple[],
  subject: string,
  relation: string,
  object: string,
): boolean {
  return false;
}

// TODO: implement expand() — every concrete subject with `relation` on `object`, sorted.
export function expand(schema: Schema, tuples: Tuple[], relation: string, object: string): string[] {
  return [];
}

export type Task = {
  id: string;
  programId: string;
  ownerOrg: string;
  visibility: 'program' | 'org-internal';
};

// TODO: implement visibleTasks() — filter tasks the user can see, per prompt.md's rule.
export function visibleTasks(tuples: Tuple[], schema: Schema, user: string, tasks: Task[]): Task[] {
  return [];
}

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
  { object: 'program:1', relation: 'owner', subject: 'user:1' },
  { object: 'program:1', relation: 'editor', subject: 'user:5' },
  { object: 'program:1', relation: 'org', subject: 'org:1' },
  { object: 'org:1', relation: 'member', subject: 'user:1' },
  { object: 'org:1', relation: 'member', subject: 'user:2' },
  { object: 'program:1', relation: 'viewer', subject: 'org:2#member' },
  { object: 'org:2', relation: 'member', subject: 'user:3' },
  { object: 'org:3', relation: 'member', subject: 'user:4' },
];

const tasks: Task[] = [
  { id: 't1', programId: '1', ownerOrg: '1', visibility: 'program' },
  { id: 't2', programId: '1', ownerOrg: '1', visibility: 'org-internal' },
  { id: 't3', programId: '1', ownerOrg: '2', visibility: 'program' },
  { id: 't4', programId: '1', ownerOrg: '2', visibility: 'org-internal' },
];

export default function App() {
  const viewers = expand(schema, tuples, 'viewer', 'program:1');
  const visibleForUser2 = visibleTasks(tuples, schema, 'user:2', tasks);
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 16 }}>
      <h3>Program 1 viewers</h3>
      <ul>
        {viewers.map((v) => (
          <li key={v}>{v}</li>
        ))}
      </ul>
      <h3>Tasks visible to user:2</h3>
      <ul>
        {visibleForUser2.map((t) => (
          <li key={t.id}>
            {t.id} ({t.visibility})
          </li>
        ))}
      </ul>
    </div>
  );
}
