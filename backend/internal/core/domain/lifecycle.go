package domain

import "fmt"

// CommonLifecycle returns the canonical transition table shared by
// ContentStatus and EditionStatus. Each type's CanTransitionTo adds
// domain-specific transitions (e.g. EditionStatus adds archived).
func CommonLifecycle[S ~string](building, review, ready, published S) map[S]map[S]bool {
	return map[S]map[S]bool{
		building:  {review: true},
		review:    {building: true, ready: true},
		ready:     {building: true, published: true},
		published: {building: true},
	}
}

// ValidateTransition checks whether transitioning from `from` to `to` is
// allowed by the provided transition table, returning a formatted error
// using ErrInvalidInput if not.
func ValidateTransition[S ~string](from, to S, table map[S]map[S]bool) error {
	if allowed, ok := table[from][to]; ok && allowed {
		return nil
	}
	return fmt.Errorf("%w: cannot transition from %q to %q", ErrInvalidInput, from, to)
}
