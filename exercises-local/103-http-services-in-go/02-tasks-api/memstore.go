package tasksapi

import (
	"sort"
	"strconv"
	"sync"
)

// MemStore is a complete, goroutine-safe, in-memory Store. It's provided so
// you can focus on the HTTP layer -- you don't implement this part.
type MemStore struct {
	mu     sync.Mutex
	tasks  map[string]Task
	nextID int
}

func NewMemStore() *MemStore {
	return &MemStore{tasks: make(map[string]Task)}
}

func (s *MemStore) List(projectID string) ([]Task, error) {
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

func (s *MemStore) Get(id string) (Task, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	t, ok := s.tasks[id]
	if !ok {
		return Task{}, ErrNotFound
	}
	return t, nil
}

func (s *MemStore) Create(t Task) (Task, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.nextID++
	t.ID = strconv.Itoa(s.nextID)
	s.tasks[t.ID] = t
	return t, nil
}

func (s *MemStore) UpdateStatus(id, status string) (Task, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	t, ok := s.tasks[id]
	if !ok {
		return Task{}, ErrNotFound
	}
	t.Status = status
	s.tasks[id] = t
	return t, nil
}
