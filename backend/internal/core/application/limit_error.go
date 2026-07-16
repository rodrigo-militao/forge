package application

import "fmt"

// LimitError is returned when a plan limit is exceeded.
type LimitError struct {
	Name    string
	Limit   int
	Current int
}

func (e *LimitError) Error() string {
	return fmt.Sprintf("%s limit reached (%d/%d)", e.Name, e.Current, e.Limit)
}

func (e *LimitError) Code() string { return "plan_limit" }
