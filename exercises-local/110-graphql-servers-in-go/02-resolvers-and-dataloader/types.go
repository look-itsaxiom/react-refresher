package resolvers

import "context"

// Project, Task, and User mirror what a gqlgen-generated models_gen.go would
// hold for a small "projects have tasks, tasks have assignees" schema.
type Project struct {
	ID   string
	Name string
}

type Task struct {
	ID         string
	ProjectID  string
	AssigneeID string // "" means unassigned
	Title      string
}

type User struct {
	ID   string
	Name string
}

// Store is the data-access seam a resolver layer is built against -- in a
// real gqlgen service this would be backed by Postgres (lessons 106-108);
// here it's MemStore, so the exercise can assert on call counts.
type Store interface {
	ProjectsByOrg(ctx context.Context, orgID string) ([]Project, error)
	TasksByProjectIDs(ctx context.Context, ids []string) (map[string][]Task, error)
	UsersByIDs(ctx context.Context, ids []string) (map[string]User, error)
}

// ProjectView and TaskView are the resolved shapes a GraphQL response would
// serialize -- the tree ResolveProjects builds.
type ProjectView struct {
	Project
	Tasks []TaskView
}

type TaskView struct {
	Task
	Assignee *User // nil when the task has no assignee
}
