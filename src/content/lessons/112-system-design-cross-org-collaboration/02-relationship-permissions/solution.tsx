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

const MAX_DEPTH = 20;

export function check(
  schema: Schema,
  tuples: Tuple[],
  subject: string,
  relation: string,
  object: string,
  path: Set<string> = new Set(),
  depth = 0,
): boolean {
  const key = `${relation}@${object}`;
  if (depth > MAX_DEPTH || path.has(key)) return false;

  const objectType = object.split(':')[0] ?? '';
  const relDef = schema[objectType]?.[relation];
  if (!relDef) return false;

  const nextPath = new Set(path).add(key);

  for (const t of tuples) {
    if (t.object !== object || t.relation !== relation) continue;
    if (t.subject === subject) return true;
    if (t.subject.includes('#')) {
      const [usersetObject = '', usersetRelation = ''] = t.subject.split('#');
      if (check(schema, tuples, subject, usersetRelation, usersetObject, nextPath, depth + 1)) return true;
    }
  }

  for (const impliedRelation of relDef.union ?? []) {
    if (check(schema, tuples, subject, impliedRelation, object, nextPath, depth + 1)) return true;
  }

  if (relDef.parent) {
    for (const t of tuples) {
      if (t.object === object && t.relation === relDef.parent.relation) {
        if (check(schema, tuples, subject, relDef.parent.via, t.subject, nextPath, depth + 1)) return true;
      }
    }
  }

  return false;
}

export function expand(
  schema: Schema,
  tuples: Tuple[],
  relation: string,
  object: string,
  path: Set<string> = new Set(),
  depth = 0,
): string[] {
  const key = `${relation}@${object}`;
  if (depth > MAX_DEPTH || path.has(key)) return [];

  const objectType = object.split(':')[0] ?? '';
  const relDef = schema[objectType]?.[relation];
  if (!relDef) return [];

  const nextPath = new Set(path).add(key);
  const result = new Set<string>();

  for (const t of tuples) {
    if (t.object !== object || t.relation !== relation) continue;
    if (t.subject.includes('#')) {
      const [usersetObject = '', usersetRelation = ''] = t.subject.split('#');
      for (const s of expand(schema, tuples, usersetRelation, usersetObject, nextPath, depth + 1)) result.add(s);
    } else {
      result.add(t.subject);
    }
  }

  for (const impliedRelation of relDef.union ?? []) {
    for (const s of expand(schema, tuples, impliedRelation, object, nextPath, depth + 1)) result.add(s);
  }

  if (relDef.parent) {
    for (const t of tuples) {
      if (t.object === object && t.relation === relDef.parent.relation) {
        for (const s of expand(schema, tuples, relDef.parent.via, t.subject, nextPath, depth + 1)) result.add(s);
      }
    }
  }

  return [...result].sort();
}

export type Task = {
  id: string;
  programId: string;
  ownerOrg: string;
  visibility: 'program' | 'org-internal';
};

export function visibleTasks(tuples: Tuple[], schema: Schema, user: string, tasks: Task[]): Task[] {
  return tasks.filter((task) => {
    const canViewProgram = check(schema, tuples, user, 'viewer', `program:${task.programId}`);
    if (!canViewProgram) return false;
    if (task.visibility === 'program') return true;
    return check(schema, tuples, user, 'member', `org:${task.ownerOrg}`);
  });
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
