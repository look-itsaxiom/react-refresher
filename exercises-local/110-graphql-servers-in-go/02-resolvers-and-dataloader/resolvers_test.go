package resolvers

import (
	"context"
	"sync"
	"testing"
	"time"
)

func testStore() *MemStore {
	projects := map[string][]Project{
		"org-1": {
			{ID: "p1", Name: "Website"},
			{ID: "p2", Name: "Mobile"},
			{ID: "p3", Name: "Platform"},
		},
	}
	tasks := map[string][]Task{
		"p1": {
			{ID: "t1", ProjectID: "p1", AssigneeID: "u1", Title: "Design landing page"},
			{ID: "t2", ProjectID: "p1", AssigneeID: "u2", Title: "Wire up analytics"},
			{ID: "t3", ProjectID: "p1", AssigneeID: "u1", Title: "Fix nav bug"},
			{ID: "t4", ProjectID: "p1", AssigneeID: "", Title: "Backlog grooming"},
		},
		"p2": {
			{ID: "t5", ProjectID: "p2", AssigneeID: "u2", Title: "Push notifications"},
			{ID: "t6", ProjectID: "p2", AssigneeID: "u3", Title: "Offline mode"},
			{ID: "t7", ProjectID: "p2", AssigneeID: "u1", Title: "App icon refresh"},
			{ID: "t8", ProjectID: "p2", AssigneeID: "u3", Title: "Crash triage"},
		},
		"p3": {
			{ID: "t9", ProjectID: "p3", AssigneeID: "u3", Title: "Rate limiter"},
			{ID: "t10", ProjectID: "p3", AssigneeID: "u1", Title: "Dataloader rollout"},
			{ID: "t11", ProjectID: "p3", AssigneeID: "u2", Title: "Schema review"},
			{ID: "t12", ProjectID: "p3", AssigneeID: "", Title: "On-call rotation"},
		},
	}
	users := map[string]User{
		"u1": {ID: "u1", Name: "Ada"},
		"u2": {ID: "u2", Name: "Grace"},
		"u3": {ID: "u3", Name: "Linus"},
	}
	return NewMemStore(projects, tasks, users)
}

func TestResolveProjectsBatchesStoreCalls(t *testing.T) {
	store := testStore()
	loaders := NewLoaders(store)

	views, err := ResolveProjects(context.Background(), store, loaders, "org-1")
	if err != nil {
		t.Fatalf("ResolveProjects: %v", err)
	}
	if len(views) != 3 {
		t.Fatalf("got %d projects, want 3", len(views))
	}

	// 3 projects x 4 tasks: a naive resolver would call TasksByProjectIDs
	// once per project (3) and UsersByIDs once per assigned task (10). A
	// batching, caching Loader collapses each into a single call.
	if got := store.callCount("TasksByProjectIDs"); got != 1 {
		t.Errorf("TasksByProjectIDs called %d times, want 1 (not one per project)", got)
	}
	if got := store.callCount("UsersByIDs"); got != 1 {
		t.Errorf("UsersByIDs called %d times, want 1 (not one per task)", got)
	}
}

func TestResolveProjectsStableOrder(t *testing.T) {
	store := testStore()
	loaders := NewLoaders(store)

	views, err := ResolveProjects(context.Background(), store, loaders, "org-1")
	if err != nil {
		t.Fatalf("ResolveProjects: %v", err)
	}

	wantProjects := []string{"p1", "p2", "p3"}
	for i, id := range wantProjects {
		if views[i].ID != id {
			t.Fatalf("views[%d].ID = %q, want %q (project order must match the store)", i, views[i].ID, id)
		}
	}

	wantTaskIDs := []string{"t1", "t2", "t3", "t4"}
	if len(views[0].Tasks) != len(wantTaskIDs) {
		t.Fatalf("got %d tasks for p1, want %d", len(views[0].Tasks), len(wantTaskIDs))
	}
	for i, id := range wantTaskIDs {
		if views[0].Tasks[i].ID != id {
			t.Fatalf("views[0].Tasks[%d].ID = %q, want %q (task order must match the store)", i, views[0].Tasks[i].ID, id)
		}
	}
}

func TestResolveProjectsMissingAssignee(t *testing.T) {
	store := testStore()
	loaders := NewLoaders(store)

	views, err := ResolveProjects(context.Background(), store, loaders, "org-1")
	if err != nil {
		t.Fatalf("ResolveProjects: %v", err)
	}

	t4 := views[0].Tasks[3]
	if t4.ID != "t4" {
		t.Fatalf("expected t4 at views[0].Tasks[3], got %q", t4.ID)
	}
	if t4.Assignee != nil {
		t.Fatalf("t4 has no assignee, want nil, got %+v", t4.Assignee)
	}

	t1 := views[0].Tasks[0]
	if t1.Assignee == nil || t1.Assignee.Name != "Ada" {
		t.Fatalf("t1.Assignee = %+v, want &User{Name: \"Ada\"}", t1.Assignee)
	}
}

func TestLoaderDedupesConcurrentSameKey(t *testing.T) {
	var mu sync.Mutex
	var calls int
	var lastKeys []string

	loader := NewLoader[string, string](func(ctx context.Context, keys []string) (map[string]string, error) {
		mu.Lock()
		calls++
		lastKeys = append([]string(nil), keys...)
		mu.Unlock()
		out := make(map[string]string, len(keys))
		for _, k := range keys {
			out[k] = "value-" + k
		}
		return out, nil
	}, 10, 20*time.Millisecond)

	var wg sync.WaitGroup
	results := make([]string, 5)
	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			v, err := loader.Load(context.Background(), "same-key")
			if err != nil {
				t.Errorf("Load: %v", err)
				return
			}
			results[i] = v
		}(i)
	}
	wg.Wait()

	mu.Lock()
	defer mu.Unlock()
	if calls != 1 {
		t.Fatalf("batchFn called %d times, want 1 (5 concurrent Loads for the same key)", calls)
	}
	if len(lastKeys) != 1 {
		t.Fatalf("batchFn received %d keys, want 1 deduplicated key", len(lastKeys))
	}
	for i, v := range results {
		if v != "value-same-key" {
			t.Fatalf("results[%d] = %q, want %q", i, v, "value-same-key")
		}
	}
}

func TestLoaderCachesAfterFirstLoad(t *testing.T) {
	var mu sync.Mutex
	var calls int

	loader := NewLoader[string, string](func(ctx context.Context, keys []string) (map[string]string, error) {
		mu.Lock()
		calls++
		mu.Unlock()
		out := make(map[string]string, len(keys))
		for _, k := range keys {
			out[k] = "value-" + k
		}
		return out, nil
	}, 10, 5*time.Millisecond)

	v1, err := loader.Load(context.Background(), "k")
	if err != nil {
		t.Fatalf("Load (1st): %v", err)
	}
	v2, err := loader.Load(context.Background(), "k")
	if err != nil {
		t.Fatalf("Load (2nd): %v", err)
	}
	if v1 != v2 {
		t.Fatalf("v1=%q v2=%q, want equal", v1, v2)
	}

	mu.Lock()
	defer mu.Unlock()
	if calls != 1 {
		t.Fatalf("batchFn called %d times, want 1 (the 2nd Load should hit the cache)", calls)
	}
}

func TestLoaderConcurrentKeysBounded(t *testing.T) {
	const total = 50
	const maxBatch = 10

	var mu sync.Mutex
	var calls int

	loader := NewLoader[int, int](func(ctx context.Context, keys []int) (map[int]int, error) {
		mu.Lock()
		calls++
		mu.Unlock()
		out := make(map[int]int, len(keys))
		for _, k := range keys {
			out[k] = k * 2
		}
		return out, nil
	}, maxBatch, 25*time.Millisecond)

	var wg sync.WaitGroup
	for i := 0; i < total; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			v, err := loader.Load(context.Background(), i)
			if err != nil {
				t.Errorf("Load(%d): %v", i, err)
				return
			}
			if v != i*2 {
				t.Errorf("Load(%d) = %d, want %d", i, v, i*2)
			}
		}(i)
	}
	wg.Wait()

	wantMax := (total + maxBatch - 1) / maxBatch // ceil(50/10) = 5

	mu.Lock()
	defer mu.Unlock()
	if calls < 1 {
		t.Fatal("batchFn was never called")
	}
	if calls > wantMax {
		t.Fatalf("batchFn called %d times, want at most %d (ceil(%d/%d))", calls, wantMax, total, maxBatch)
	}
}
