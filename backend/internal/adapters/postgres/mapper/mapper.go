package mapper

import (
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

// UUIDToDomain converts a pgtype.UUID to a Go uuid.UUID.
// Returns the zero value when !Valid.
func UUIDToDomain(id pgtype.UUID) uuid.UUID {
	if !id.Valid {
		return uuid.UUID{}
	}
	return id.Bytes
}

// DomainUUID converts a uuid.UUID to a valid pgtype.UUID.
func DomainUUID(id uuid.UUID) pgtype.UUID {
	return pgtype.UUID{Bytes: id, Valid: true}
}

// TimeToDomain converts a pgtype.Timestamptz to a *time.Time.
// Returns nil when !Valid.
func TimeToDomain(t pgtype.Timestamptz) *time.Time {
	if !t.Valid {
		return nil
	}
	return &t.Time
}

// DomainTimePtr converts a *time.Time to a pgtype.Timestamptz.
func DomainTimePtr(t *time.Time) pgtype.Timestamptz {
	if t == nil {
		return pgtype.Timestamptz{Valid: false}
	}
	return pgtype.Timestamptz{Time: *t, Valid: true}
}

// StrToDomain converts a pgtype.Text to a string.
// Returns "" when !Valid.
func StrToDomain(s pgtype.Text) string {
	if !s.Valid {
		return ""
	}
	return s.String
}

// DomainStrPtr converts a *string to a pgtype.Text.
func DomainStrPtr(s *string) pgtype.Text {
	if s == nil {
		return pgtype.Text{Valid: false}
	}
	return pgtype.Text{String: *s, Valid: true}
}

// IntToDomain converts a pgtype.Int4 to an int.
// Returns 0 when !Valid.
func IntToDomain(i pgtype.Int4) int {
	if !i.Valid {
		return 0
	}
	return int(i.Int32)
}

// BoolToDomain converts a pgtype.Bool to a bool.
// Returns false when !Valid.
func BoolToDomain(b pgtype.Bool) bool {
	if !b.Valid {
		return false
	}
	return b.Bool
}

// DomainBool converts a bool to a valid pgtype.Bool.
func DomainBool(b bool) pgtype.Bool {
	return pgtype.Bool{Bool: b, Valid: true}
}

// StrPtrToDomain converts a pgtype.Text to a *string.
// Returns nil when !Valid.
func StrPtrToDomain(s pgtype.Text) *string {
	if !s.Valid {
		return nil
	}
	return &s.String
}

// DomainStrPtrOrNil converts a *string to a pgtype.Text with Valid=false when nil.
func DomainStrPtrOrNil(s *string) pgtype.Text {
	if s == nil {
		return pgtype.Text{Valid: false}
	}
	return pgtype.Text{String: *s, Valid: true}
}
