//go:build !solution

package fetchall

// Result pairs a fetched id with the value FetchAll got back for it.
type Result struct {
	ID    string
	Value int
}

// FetchAll fetches every id, using at most maxConcurrent fetches in flight
// at once, and returns the results in the same order as ids. If any fetch
// returns an error, FetchAll returns that error; goroutines already in
// flight may finish, but none should be left running forever.
//
// TODO: this is a sequential placeholder. It ignores maxConcurrent
// entirely, so fetches never actually overlap. Make it concurrent.
func FetchAll(ids []string, fetch func(id string) (int, error), maxConcurrent int) ([]Result, error) {
	results := make([]Result, len(ids))
	for i, id := range ids {
		value, err := fetch(id)
		if err != nil {
			return nil, err
		}
		results[i] = Result{ID: id, Value: value}
	}
	return results, nil
}

// Counter is a count that many goroutines can increment at once.
//
// TODO: this implementation is not safe for concurrent use. Fix it.
type Counter struct {
	val int
}

func (c *Counter) Inc() {
	c.val++
}

func (c *Counter) Value() int {
	return c.val
}
