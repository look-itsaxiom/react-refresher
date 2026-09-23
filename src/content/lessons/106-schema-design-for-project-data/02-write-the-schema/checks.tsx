import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'organizations, users, projects, and tasks use uuid primary keys',
    run: async ({ db, expect }) => {
      const r = await db.query<{ table_name: string; column_name: string; data_type: string }>(
        `select table_name, column_name, data_type
         from information_schema.columns
         where table_schema = 'public' and column_name = 'id'
           and table_name in ('organizations', 'users', 'projects', 'tasks')
         order by table_name`,
      );
      expect(r.rows).to.have.length(4);
      for (const row of r.rows) {
        expect(row.data_type, `${row.table_name}.id should be uuid`).to.equal('uuid');
      }
    },
  },
  {
    name: 'membership_role, share_role, and task_status are enums with the right labels',
    run: async ({ db, expect }) => {
      const labelsFor = async (typeName: string) => {
        const r = await db.query<{ enumlabel: string }>(
          `select e.enumlabel from pg_type t
           join pg_enum e on t.oid = e.enumtypid
           where t.typname = $1
           order by e.enumsortorder`,
          [typeName],
        );
        return r.rows.map((row) => row.enumlabel);
      };
      expect(await labelsFor('membership_role')).to.deep.equal(['owner', 'admin', 'member', 'viewer']);
      expect(await labelsFor('share_role')).to.deep.equal(['editor', 'viewer']);
      expect(await labelsFor('task_status')).to.deep.equal(['todo', 'doing', 'blocked', 'done']);
    },
  },
  {
    name: 'memberships has a composite primary key on (user_id, org_id)',
    run: async ({ db, expect }) => {
      const r = await db.query<{ column_name: string }>(
        `select kcu.column_name
         from information_schema.table_constraints tc
         join information_schema.key_column_usage kcu
           on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
         where tc.table_schema = 'public' and tc.table_name = 'memberships' and tc.constraint_type = 'PRIMARY KEY'
         order by kcu.column_name`,
      );
      expect(r.rows.map((row) => row.column_name)).to.deep.equal(['org_id', 'user_id']);
    },
  },
  {
    name: 'projects enforces unique (org_id, name)',
    run: async ({ db, expect }) => {
      const org = await db.query<{ id: string }>(`insert into organizations (name) values ('Acme') returning id`);
      const orgId = org.rows[0]!.id;
      await db.exec(`insert into projects (org_id, name) values ('${orgId}', 'Radar Upgrade')`);
      let message = '';
      try {
        await db.exec(`insert into projects (org_id, name) values ('${orgId}', 'Radar Upgrade')`);
      } catch (e) {
        message = e instanceof Error ? e.message : String(e);
      }
      expect(message, 'a duplicate (org_id, name) should be rejected').to.match(/unique|duplicate/i);
    },
  },
  {
    name: 'deleting an organization that still owns a project is restricted',
    run: async ({ db, expect }) => {
      const org = await db.query<{ id: string }>(`insert into organizations (name) values ('Acme') returning id`);
      const orgId = org.rows[0]!.id;
      await db.exec(`insert into projects (org_id, name) values ('${orgId}', 'Radar Upgrade')`);
      let message = '';
      try {
        await db.exec(`delete from organizations where id = '${orgId}'`);
      } catch (e) {
        message = e instanceof Error ? e.message : String(e);
      }
      expect(message, 'deleting an org that owns a project should be restricted, not silent').to.match(/foreign key/i);
    },
  },
  {
    name: 'deleting a project cascades to its tasks',
    run: async ({ db, expect }) => {
      const org = await db.query<{ id: string }>(`insert into organizations (name) values ('Acme') returning id`);
      const orgId = org.rows[0]!.id;
      const proj = await db.query<{ id: string }>(
        `insert into projects (org_id, name) values ('${orgId}', 'Radar Upgrade') returning id`,
      );
      const projId = proj.rows[0]!.id;
      await db.exec(`insert into tasks (project_id, title) values ('${projId}', 'Draft spec')`);
      await db.exec(`delete from projects where id = '${projId}'`);
      const remaining = await db.query<{ n: number }>(`select count(*)::int as n from tasks`);
      expect(remaining.rows[0]!.n).to.equal(0);
    },
  },
  {
    name: 'a task cannot depend on itself',
    run: async ({ db, expect }) => {
      const org = await db.query<{ id: string }>(`insert into organizations (name) values ('Acme') returning id`);
      const orgId = org.rows[0]!.id;
      const proj = await db.query<{ id: string }>(
        `insert into projects (org_id, name) values ('${orgId}', 'Radar Upgrade') returning id`,
      );
      const projId = proj.rows[0]!.id;
      const task = await db.query<{ id: string }>(
        `insert into tasks (project_id, title) values ('${projId}', 'Draft spec') returning id`,
      );
      const taskId = task.rows[0]!.id;
      let message = '';
      try {
        await db.exec(`insert into task_dependencies (predecessor_id, successor_id) values ('${taskId}', '${taskId}')`);
      } catch (e) {
        message = e instanceof Error ? e.message : String(e);
      }
      expect(message, 'predecessor_id = successor_id should violate a check constraint').to.match(/check/i);
    },
  },
  {
    name: 'a negative estimate is rejected',
    run: async ({ db, expect }) => {
      const org = await db.query<{ id: string }>(`insert into organizations (name) values ('Acme') returning id`);
      const orgId = org.rows[0]!.id;
      const proj = await db.query<{ id: string }>(
        `insert into projects (org_id, name) values ('${orgId}', 'Radar Upgrade') returning id`,
      );
      const projId = proj.rows[0]!.id;
      let message = '';
      try {
        await db.exec(`insert into tasks (project_id, title, estimate_minutes) values ('${projId}', 'Bad estimate', -5)`);
      } catch (e) {
        message = e instanceof Error ? e.message : String(e);
      }
      expect(message, 'a negative estimate should violate a check constraint').to.match(/check/i);
    },
  },
  {
    name: "updated_at moves on an update, driven by a trigger, not the client",
    run: async ({ db, expect }) => {
      const org = await db.query<{ id: string }>(`insert into organizations (name) values ('Acme') returning id`);
      const orgId = org.rows[0]!.id;
      const proj = await db.query<{ id: string }>(
        `insert into projects (org_id, name) values ('${orgId}', 'Radar Upgrade') returning id`,
      );
      const projId = proj.rows[0]!.id;
      // Push updated_at into the past explicitly, then update WITHOUT setting updated_at:
      // only a trigger can move it back to "now".
      await db.exec(`update projects set updated_at = now() - interval '1 day' where id = '${projId}'`);
      const before = await db.query<{ updated_at: string }>(`select updated_at from projects where id = '${projId}'`);
      await db.exec(`update projects set name = 'Radar Upgrade v2' where id = '${projId}'`);
      const after = await db.query<{ updated_at: string }>(`select updated_at from projects where id = '${projId}'`);
      expect(
        new Date(after.rows[0]!.updated_at).getTime(),
        'updated_at should be set to roughly now by a trigger, not left at the explicit past value',
      ).to.be.greaterThan(new Date(before.rows[0]!.updated_at).getTime());
    },
  },
];
