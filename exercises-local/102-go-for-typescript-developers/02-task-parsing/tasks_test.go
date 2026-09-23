package tasks

import (
	"errors"
	"reflect"
	"strings"
	"testing"
	"time"
)

func TestParseTaskLine(t *testing.T) {
	t.Run("valid with deps", func(t *testing.T) {
		got, err := ParseTaskLine("PROJ-12 | Ship the vendor import | 3h30m | todo | PROJ-3,PROJ-7")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		want := Task{
			ID:       "PROJ-12",
			Title:    "Ship the vendor import",
			Estimate: 3*time.Hour + 30*time.Minute,
			Status:   StatusTodo,
			Deps:     []string{"PROJ-3", "PROJ-7"},
		}
		if !reflect.DeepEqual(got, want) {
			t.Fatalf("ParseTaskLine() = %+v, want %+v", got, want)
		}
	})

	t.Run("valid without deps", func(t *testing.T) {
		got, err := ParseTaskLine("PROJ-1 | Draft the schema | 45m | done")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if got.ID != "PROJ-1" || got.Status != StatusDone || len(got.Deps) != 0 {
			t.Fatalf("ParseTaskLine() = %+v, want PROJ-1/done with no deps", got)
		}
	})

	errorCases := []struct {
		name string
		line string
	}{
		{"too few fields", "PROJ-1 | Only two fields"},
		{"too many fields", "PROJ-1 | Title | 1h | todo | PROJ-2 | extra"},
		{"bad duration", "PROJ-1 | Title | not-a-duration | todo"},
		{"bad status", "PROJ-1 | Title | 1h | someday"},
		{"empty id", " | Title | 1h | todo"},
	}
	for _, tc := range errorCases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := ParseTaskLine(tc.line)
			if err == nil {
				t.Fatalf("ParseTaskLine(%q) succeeded, want error", tc.line)
			}
			if !errors.Is(err, ErrMalformed) {
				t.Fatalf("ParseTaskLine(%q) error = %v, want errors.Is(err, ErrMalformed)", tc.line, err)
			}
		})
	}
}

func TestParseTasks(t *testing.T) {
	input := strings.Join([]string{
		"# vendor onboarding tasks",
		"",
		"PROJ-1 | Draft the schema | 45m | done",
		"   ",
		"PROJ-2 | Review vendor contract | 2h | todo | PROJ-1",
		"# ready for import",
		"PROJ-3 | Import vendor records | 1h30m | in-progress | PROJ-1,PROJ-2",
	}, "\n")

	got, err := ParseTasks(strings.NewReader(input))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 3 {
		t.Fatalf("ParseTasks() returned %d tasks, want 3", len(got))
	}
	if got[0].ID != "PROJ-1" || got[1].ID != "PROJ-2" || got[2].ID != "PROJ-3" {
		t.Fatalf("ParseTasks() order = %v, %v, %v, want PROJ-1, PROJ-2, PROJ-3", got[0].ID, got[1].ID, got[2].ID)
	}

	t.Run("reports the line number", func(t *testing.T) {
		bad := strings.Join([]string{
			"PROJ-1 | Draft the schema | 45m | done",
			"PROJ-2 | Bad line | not-a-duration | todo",
		}, "\n")
		_, err := ParseTasks(strings.NewReader(bad))
		if err == nil {
			t.Fatal("ParseTasks() succeeded, want error")
		}
		if !errors.Is(err, ErrMalformed) {
			t.Fatalf("ParseTasks() error = %v, want errors.Is(err, ErrMalformed)", err)
		}
		if !strings.Contains(err.Error(), "line 2") {
			t.Fatalf("ParseTasks() error = %v, want it to mention line 2", err)
		}
	})
}

func TestTotalEstimate(t *testing.T) {
	tasks := []Task{
		{Estimate: 1 * time.Hour},
		{Estimate: 30 * time.Minute},
		{Estimate: 15 * time.Minute},
	}
	got := TotalEstimate(tasks)
	want := 1*time.Hour + 45*time.Minute
	if got != want {
		t.Fatalf("TotalEstimate() = %v, want %v", got, want)
	}
}

func TestGroupByStatus(t *testing.T) {
	tasks := []Task{
		{ID: "PROJ-1", Status: StatusTodo},
		{ID: "PROJ-2", Status: StatusDone},
		{ID: "PROJ-3", Status: StatusTodo},
		{ID: "PROJ-4", Status: StatusInProgress},
	}
	got := GroupByStatus(tasks)

	todo := got[StatusTodo]
	if len(todo) != 2 || todo[0].ID != "PROJ-1" || todo[1].ID != "PROJ-3" {
		t.Fatalf("GroupByStatus()[todo] = %v, want [PROJ-1 PROJ-3] in that order", todo)
	}
	if len(got[StatusDone]) != 1 || got[StatusDone][0].ID != "PROJ-2" {
		t.Fatalf("GroupByStatus()[done] = %v, want [PROJ-2]", got[StatusDone])
	}
	if len(got[StatusInProgress]) != 1 || got[StatusInProgress][0].ID != "PROJ-4" {
		t.Fatalf("GroupByStatus()[in-progress] = %v, want [PROJ-4]", got[StatusInProgress])
	}
}

func TestGroupByStatusAliasing(t *testing.T) {
	tasks := []Task{
		{ID: "PROJ-1", Status: StatusTodo},
		{ID: "PROJ-2", Status: StatusTodo},
	}
	before := make([]Task, len(tasks))
	copy(before, tasks)

	groups := GroupByStatus(tasks)
	if groups == nil {
		t.Fatal("GroupByStatus() returned a nil map")
	}
	groups[StatusTodo] = append(groups[StatusTodo], Task{ID: "PROJ-99", Status: StatusTodo})

	if !reflect.DeepEqual(tasks, before) {
		t.Fatalf("appending to a GroupByStatus result mutated the input slice: got %+v, want %+v", tasks, before)
	}
}
