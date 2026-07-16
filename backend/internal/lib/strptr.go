package lib

// StrPtr returns a pointer to a copy of s.
func StrPtr(s string) *string { return &s }
