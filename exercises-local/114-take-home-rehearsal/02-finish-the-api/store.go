package takehome

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"sync"
)

// Task is the unit of work the whole API operates on. json tags control the
// wire shape a client sees, independent of the Go field names.
type Task struct {
	ID        string `json:"id"`
	ProjectID string `json:"projectId"`
	Title     string `json:"title"`
	Status    string `json:"status"` // "todo", "doing", or "done"
}

// Store is the persistence seam: everything the HTTP layer needs from
// storage, independent of whether it's backed by memory or Postgres. Handlers
// depend on this interface, never on MemStore or a *sql.DB directly -- a real
// submission would add a Postgres-backed implementation (database/sql plus
// the pgx stdlib driver, or generated with sqlc) that satisfies the same
// four methods and maps onto migrations/0001_init.sql. That implementation
// isn't part of this exercise.
type Store interface {
	ListTasks(ctx context.Context, projectID string) ([]Task, error)
	CreateTask(ctx context.Context, t Task) (Task, error)
	AddDependency(ctx context.Context, predecessorID, successorID string) error
	Ready(ctx context.Context, projectID string) ([]Task, error)
}

// ErrNotFound is returned when a task id doesn't exist.
var ErrNotFound = errors.New("task not found")

// ErrCycle is returned when adding a dependency would create a cycle in the
// dependency graph.
var ErrCycle = errors.New("dependency would create a cycle")

// MemStore is a complete, goroutine-safe, in-memory Store. It's provided so
// you can focus on the HTTP layer in server.go -- you don't implement this
// part, the same way lesson 103's MemStore was handed to you.
type MemStore struct {
	mu     sync.Mutex
	tasks  map[string]Task
	nextID int
	// deps[successorID] is the set of predecessor IDs that must be done
	// before successorID is ready. This is the adjacency the cycle check
	// and Ready walk.
	deps map[string]map[string]bool
}

func NewMemStore() *MemStore {
	return &MemStore{
		tasks: make(map[string]Task),
		deps:  make(map[string]map[string]bool),
	}
}

func (s *MemStore) ListTasks(_ context.Context, projectID string) ([]Task, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	var out []Task
	for _, t := range s.tasks {
		if t.ProjectID == projectID {
			out = append(out, t)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ID < out[j].ID })
	return out, nil
}

func (s *MemStore) CreateTask(_ context.Context, t Task) (Task, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.nextID++
	t.ID = fmt.Sprintf("t%d", s.nextID)
	if t.Status == "" {
		t.Status = "todo"
	}
	s.tasks[t.ID] = t
	return t, nil
}

// AddDependency records that successorID cannot start until predecessorID is
// done. It rejects unknown ids with ErrNotFound, and -- walking the existing
// dependency edges by depth-first search from successorID looking for a path
// back to predecessorID -- rejects any edge that would close a cycle with
// ErrCycle.
func (s *MemStore) AddDependency(_ context.Context, predecessorID, successorID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.tasks[predecessorID]; !ok {
		return ErrNotFound
	}
	if _, ok := s.tasks[successorID]; !ok {
		return ErrNotFound
	}
	if predecessorID == successorID {
		return ErrCycle
	}
	// Adding predecessorID -> successorID would close a cycle exactly when
	// predecessorID can already reach successorID through existing edges
	// (i.e. predecessorID already depends, transitively, on successorID --
	// making successorID depend on predecessorID too would loop back).
	if s.reaches(predecessorID, successorID) {
		return ErrCycle
	}

	if s.deps[successorID] == nil {
		s.deps[successorID] = make(map[string]bool)
	}
	s.deps[successorID][predecessorID] = true
	return nil
}

// reaches reports whether there is a path of existing dependency edges from
// "from" to "target", i.e. whether "from" transitively depends on "target".
func (s *MemStore) reaches(from, target string) bool {
	visited := make(map[string]bool)
	var dfs func(id string) bool
	dfs = func(id string) bool {
		if id == target {
			return true
		}
		if visited[id] {
			return false
		}
		visited[id] = true
		for pred := range s.deps[id] {
			if dfs(pred) {
				return true
			}
		}
		return false
	}
	return dfs(from)
}

// Ready returns the project's tasks that are not already done and whose
// predecessors, if any, are all done.
func (s *MemStore) Ready(_ context.Context, projectID string) ([]Task, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	var out []Task
	for _, t := range s.tasks {
		if t.ProjectID != projectID || t.Status == "done" {
			continue
		}
		blocked := false
		for pred := range s.deps[t.ID] {
			if s.tasks[pred].Status != "done" {
				blocked = true
				break
			}
		}
		if !blocked {
			out = append(out, t)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ID < out[j].ID })
	return out, nil
}
