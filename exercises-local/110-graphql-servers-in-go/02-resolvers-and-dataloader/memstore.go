package resolvers

import (
	"context"
	"sync"
)

// MemStore is a Store backed by in-memory maps that records how many times
// each method was called, so tests can assert on batching behavior directly.
type MemStore struct {
	mu    sync.Mutex
	Calls map[string]int

	projects map[string][]Project // orgID -> projects
	tasks    map[string][]Task    // projectID -> tasks
	users    map[string]User      // userID -> user
}

func NewMemStore(projects map[string][]Project, tasks map[string][]Task, users map[string]User) *MemStore {
	return &MemStore{
		Calls:    make(map[string]int),
		projects: projects,
		tasks:    tasks,
		users:    users,
	}
}

func (m *MemStore) record(name string) {
	m.mu.Lock()
	m.Calls[name]++
	m.mu.Unlock()
}

func (m *MemStore) callCount(name string) int {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.Calls[name]
}

func (m *MemStore) ProjectsByOrg(ctx context.Context, orgID string) ([]Project, error) {
	m.record("ProjectsByOrg")
	return append([]Project(nil), m.projects[orgID]...), nil
}

func (m *MemStore) TasksByProjectIDs(ctx context.Context, ids []string) (map[string][]Task, error) {
	m.record("TasksByProjectIDs")
	out := make(map[string][]Task, len(ids))
	for _, id := range ids {
		out[id] = append([]Task(nil), m.tasks[id]...)
	}
	return out, nil
}

func (m *MemStore) UsersByIDs(ctx context.Context, ids []string) (map[string]User, error) {
	m.record("UsersByIDs")
	out := make(map[string]User, len(ids))
	for _, id := range ids {
		if u, ok := m.users[id]; ok {
			out[id] = u
		}
	}
	return out, nil
}
