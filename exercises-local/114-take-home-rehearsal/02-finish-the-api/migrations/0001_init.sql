-- 0001_init.sql
--
-- Minimal schema for the take-home: projects, tasks, and a dependency edge
-- table between tasks (see lesson 106 for the modeling behind this shape).
-- This file isn't run by any test in this exercise -- it's the schema the
-- Postgres-backed Store described in store.go would map onto.

CREATE TABLE projects (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tasks (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title       text NOT NULL,
    status      text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done')),
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- The API's hottest read is "list (or find ready) tasks for a project" --
-- this is the index that query actually uses.
CREATE INDEX tasks_project_id_idx ON tasks (project_id);

CREATE TABLE task_dependencies (
    predecessor_id  uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    successor_id    uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    PRIMARY KEY (predecessor_id, successor_id),
    CHECK (predecessor_id <> successor_id)
);

-- Ready-check walks "does this task have an incomplete predecessor", which
-- looks up by successor_id.
CREATE INDEX task_dependencies_successor_id_idx ON task_dependencies (successor_id);
