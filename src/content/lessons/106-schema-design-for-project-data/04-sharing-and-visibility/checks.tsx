import type { Check } from '../../../types';

const ALICE = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'; // Acme, owner
const BOB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'; // Acme, viewer
const CAROL = 'cccccccc-cccc-cccc-cccc-cccccccccccc'; // Vendor Co, admin
const DAVE = 'dddddddd-dddd-dddd-dddd-dddddddddddd'; // Vendor Co, member

const RADAR = 'f1111111-1111-1111-1111-111111111111'; // Acme's, shared with Vendor Co as viewer
const SURVEY = 'f2222222-2222-2222-2222-222222222222'; // Acme's, not shared

async function taskIdIn(db: import('../../../types').SqlDb, projectId: string): Promise<string> {
  const r = await db.query<{ id: string }>('select id from tasks where project_id = $1 order by title limit 1', [projectId]);
  return r.rows[0]!.id;
}

export const checks: Check[] = [
  {
    name: 'an org member sees every project their org owns, with access = member',
    run: async ({ db, expect }) => {
      const r = await db.query<{ project_id: string; access: string }>(
        'select project_id, access from visible_projects where user_id = $1 order by project_id',
        [ALICE],
      );
      expect(r.rows).to.deep.equal([
        { project_id: RADAR, access: 'member' },
        { project_id: SURVEY, access: 'member' },
      ]);
    },
  },
  {
    name: 'a viewer-share user sees only the shared project, at the share role, and nothing unshared',
    run: async ({ db, expect }) => {
      const carol = await db.query<{ project_id: string; access: string }>(
        'select project_id, access from visible_projects where user_id = $1 order by project_id',
        [CAROL],
      );
      expect(carol.rows).to.deep.equal([{ project_id: RADAR, access: 'viewer' }]);

      const dave = await db.query<{ project_id: string; access: string }>(
        'select project_id, access from visible_projects where user_id = $1 order by project_id',
        [DAVE],
      );
      expect(dave.rows).to.deep.equal([{ project_id: RADAR, access: 'viewer' }]);
    },
  },
  {
    name: 'a stranger to a project sees nothing for it',
    run: async ({ db, expect }) => {
      const r = await db.query<{ project_id: string }>(
        'select project_id from visible_projects where user_id = $1 and project_id = $2',
        [CAROL, SURVEY],
      );
      expect(r.rows).to.have.length(0);
    },
  },
  {
    name: 'task_counts_by_project uses conditional aggregation correctly',
    run: async ({ db, expect }) => {
      const radar = await db.query<{ todo: number; doing: number; blocked: number; done: number; total: number }>(
        'select todo, doing, blocked, done, total from task_counts_by_project where project_id = $1',
        [RADAR],
      );
      expect(radar.rows[0]).to.deep.equal({ todo: 1, doing: 1, blocked: 0, done: 1, total: 3 });

      const survey = await db.query<{ todo: number; doing: number; blocked: number; done: number; total: number }>(
        'select todo, doing, blocked, done, total from task_counts_by_project where project_id = $1',
        [SURVEY],
      );
      expect(survey.rows[0]).to.deep.equal({ todo: 0, doing: 0, blocked: 1, done: 0, total: 1 });
    },
  },
  {
    name: 'an owning-org owner can edit a task; an owning-org viewer cannot',
    run: async ({ db, expect }) => {
      const taskId = await taskIdIn(db, RADAR);
      const aliceCanEdit = await db.query<{ can_edit_task: boolean }>('select can_edit_task($1, $2)', [ALICE, taskId]);
      expect(aliceCanEdit.rows[0]!.can_edit_task).to.equal(true);

      const bobCanEdit = await db.query<{ can_edit_task: boolean }>('select can_edit_task($1, $2)', [BOB, taskId]);
      expect(bobCanEdit.rows[0]!.can_edit_task).to.equal(false);
    },
  },
  {
    name: 'a viewer-share user cannot edit, even though they can see the task',
    run: async ({ db, expect }) => {
      const taskId = await taskIdIn(db, RADAR);
      const carolCanEdit = await db.query<{ can_edit_task: boolean }>('select can_edit_task($1, $2)', [CAROL, taskId]);
      expect(carolCanEdit.rows[0]!.can_edit_task).to.equal(false);
    },
  },
  {
    name: 'a stranger cannot edit a task in an unrelated project',
    run: async ({ db, expect }) => {
      const taskId = await taskIdIn(db, SURVEY);
      const carolCanEdit = await db.query<{ can_edit_task: boolean }>('select can_edit_task($1, $2)', [CAROL, taskId]);
      expect(carolCanEdit.rows[0]!.can_edit_task).to.equal(false);
      const daveCanEdit = await db.query<{ can_edit_task: boolean }>('select can_edit_task($1, $2)', [DAVE, taskId]);
      expect(daveCanEdit.rows[0]!.can_edit_task).to.equal(false);
    },
  },
];
