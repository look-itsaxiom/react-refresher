//go:build solution

package tasks

import (
	"bufio"
	"errors"
	"fmt"
	"io"
	"strings"
	"time"
)

type Status string

const (
	StatusTodo       Status = "todo"
	StatusInProgress Status = "in-progress"
	StatusDone       Status = "done"
)

type Task struct {
	ID       string
	Title    string
	Estimate time.Duration
	Status   Status
	Deps     []string
}

var ErrMalformed = errors.New("malformed task line")

func ParseTaskLine(line string) (Task, error) {
	fields := strings.Split(line, "|")
	for i := range fields {
		fields[i] = strings.TrimSpace(fields[i])
	}
	if len(fields) != 4 && len(fields) != 5 {
		return Task{}, fmt.Errorf("%w: want 4 or 5 fields separated by \"|\", got %d", ErrMalformed, len(fields))
	}

	id, title, estField, statusField := fields[0], fields[1], fields[2], fields[3]
	if id == "" {
		return Task{}, fmt.Errorf("%w: empty id", ErrMalformed)
	}
	if title == "" {
		return Task{}, fmt.Errorf("%w: empty title", ErrMalformed)
	}

	estimate, err := time.ParseDuration(estField)
	if err != nil {
		return Task{}, fmt.Errorf("%w: invalid estimate %q: %v", ErrMalformed, estField, err)
	}

	status := Status(statusField)
	switch status {
	case StatusTodo, StatusInProgress, StatusDone:
	default:
		return Task{}, fmt.Errorf("%w: invalid status %q", ErrMalformed, statusField)
	}

	var deps []string
	if len(fields) == 5 && fields[4] != "" {
		for _, d := range strings.Split(fields[4], ",") {
			d = strings.TrimSpace(d)
			if d != "" {
				deps = append(deps, d)
			}
		}
	}

	return Task{ID: id, Title: title, Estimate: estimate, Status: status, Deps: deps}, nil
}

func ParseTasks(r io.Reader) ([]Task, error) {
	var result []Task
	scanner := bufio.NewScanner(r)
	lineNum := 0
	for scanner.Scan() {
		lineNum++
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		task, err := ParseTaskLine(line)
		if err != nil {
			return nil, fmt.Errorf("line %d: %w", lineNum, err)
		}
		result = append(result, task)
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}
	return result, nil
}

func TotalEstimate(tasks []Task) time.Duration {
	var total time.Duration
	for _, t := range tasks {
		total += t.Estimate
	}
	return total
}

func GroupByStatus(tasks []Task) map[Status][]Task {
	groups := make(map[Status][]Task)
	for _, t := range tasks {
		groups[t.Status] = append(groups[t.Status], t)
	}
	return groups
}
