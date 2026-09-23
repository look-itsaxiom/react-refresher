package graphcost

import "fmt"

// Field is a tiny selection-set AST -- enough to model a restricted subset
// of a GraphQL query: `projects(first: 10) { tasks(first: 20) { assignee { name } } }`.
type Field struct {
	Name       string
	Args       map[string]int
	Selections []Field
}

// CostRules configures Cost. PerField overrides the per-field cost for a
// named field; anything not listed falls back to Default. ListArg names the
// argument (conventionally "first") whose value multiplies a field's
// children's cost, the way a list of N items multiplies the cost of
// resolving each item's subtree by N.
type CostRules struct {
	Default  int
	PerField map[string]int
	ListArg  string
}

// LimitError is returned by Enforce when a query's cost or depth exceeds
// the configured maximum.
type LimitError struct {
	Kind string // "cost" or "depth"
	Have int
	Max  int
}

func (e *LimitError) Error() string {
	return fmt.Sprintf("graphcost: %s limit exceeded: have %d, max %d", e.Kind, e.Have, e.Max)
}
