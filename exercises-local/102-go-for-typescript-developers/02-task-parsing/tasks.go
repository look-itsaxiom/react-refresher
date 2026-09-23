//go:build !solution

package tasks

import (
	"errors"
	"io"
	"time"
)

// Status is the lifecycle state of a task.
type Status string

const (
	StatusTodo       Status = "todo"
	StatusInProgress Status = "in-progress"
	StatusDone       Status = "done"
)

// Task is one line of a project's task list.
type Task struct {
	ID       string
	Title    string
	Estimate time.Duration
	Status   Status
	Deps     []string
}

// ErrMalformed is wrapped by every parse error, so callers can test for a
// parse failure with errors.Is instead of matching on message text.
var ErrMalformed = errors.New("malformed task line")

// ParseTaskLine parses one line of the form
//
//	PROJ-12 | Ship the vendor import | 3h30m | todo | PROJ-3,PROJ-7
//
// The trailing dependency list is optional. Any structural problem (wrong
// field count, an unparseable estimate, an unknown status) must return an
// error that wraps ErrMalformed.
//
// TODO: implement.
func ParseTaskLine(line string) (Task, error) {
	return Task{}, nil
}

// ParseTasks reads one task per line from r, skipping blank lines and lines
// starting with "#". If a line fails to parse, the returned error must name
// the 1-based line number and wrap the underlying ParseTaskLine error.
//
// TODO: implement.
func ParseTasks(r io.Reader) ([]Task, error) {
	return nil, nil
}

// TotalEstimate sums the Estimate of every task.
//
// TODO: implement.
func TotalEstimate(tasks []Task) time.Duration {
	return 0
}

// GroupByStatus buckets tasks by Status, preserving each task's relative
// order within its bucket. The returned slices must not share a backing
// array with tasks in a way that mutating one affects the other.
//
// TODO: implement.
func GroupByStatus(tasks []Task) map[Status][]Task {
	return nil
}
