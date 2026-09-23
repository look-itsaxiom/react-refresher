package graphcost

// Enforce checks f against both limits and returns the first one it
// violates (cost checked before depth) as a *LimitError, or nil when f is
// within both.
func Enforce(f Field, rules CostRules, maxCost, maxDepth int) error {
	if cost := Cost(f, rules); cost > maxCost {
		return &LimitError{Kind: "cost", Have: cost, Max: maxCost}
	}
	if depth := Depth(f); depth > maxDepth {
		return &LimitError{Kind: "depth", Have: depth, Max: maxDepth}
	}
	return nil
}
