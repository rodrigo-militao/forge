package mapper

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

func TestUUIDToDomain(t *testing.T) {
	id := uuid.New()
	got := UUIDToDomain(pgtype.UUID{Bytes: id, Valid: true})
	if got != id {
		t.Errorf("expected %v, got %v", id, got)
	}
}

func TestUUIDToDomain_invalid(t *testing.T) {
	got := UUIDToDomain(pgtype.UUID{Valid: false})
	var zero uuid.UUID
	if got != zero {
		t.Errorf("expected zero UUID, got %v", got)
	}
}

func TestDomainUUID(t *testing.T) {
	id := uuid.New()
	got := DomainUUID(id)
	if !got.Valid {
		t.Fatal("expected valid")
	}
	if got.Bytes != id {
		t.Errorf("expected %v, got %v", id, got.Bytes)
	}
}

func TestDomainUUID_zeroValue(t *testing.T) {
	var zero uuid.UUID
	got := DomainUUID(zero)
	if !got.Valid {
		t.Fatal("expected valid even for zero UUID")
	}
	if got.Bytes != zero {
		t.Errorf("expected zero UUID, got %v", got.Bytes)
	}
}

func TestUUIDRoundTrip(t *testing.T) {
	original := uuid.New()
	pg := DomainUUID(original)
	back := UUIDToDomain(pg)
	if original != back {
		t.Errorf("round trip: expected %v, got %v", original, back)
	}
}

func TestTimeToDomain(t *testing.T) {
	now := time.Now().Round(time.Microsecond)
	got := TimeToDomain(pgtype.Timestamptz{Time: now, Valid: true})
	if got == nil {
		t.Fatal("expected non-nil time")
	}
	if !got.Equal(now) {
		t.Errorf("expected %v, got %v", now, got)
	}
}

func TestTimeToDomain_invalid(t *testing.T) {
	got := TimeToDomain(pgtype.Timestamptz{Valid: false})
	if got != nil {
		t.Errorf("expected nil, got %v", got)
	}
}

func TestDomainTimePtr(t *testing.T) {
	now := time.Now().Round(time.Microsecond)
	got := DomainTimePtr(&now)
	if !got.Valid {
		t.Fatal("expected valid")
	}
	if !got.Time.Equal(now) {
		t.Errorf("expected %v, got %v", now, got.Time)
	}
}

func TestDomainTimePtr_nil(t *testing.T) {
	got := DomainTimePtr(nil)
	if got.Valid {
		t.Fatal("expected not valid for nil input")
	}
}

func TestTimeRoundTrip(t *testing.T) {
	original := time.Now().Round(time.Microsecond)
	pg := DomainTimePtr(&original)
	back := TimeToDomain(pg)
	if back == nil {
		t.Fatal("expected non-nil time")
	}
	if !back.Equal(original) {
		t.Errorf("round trip: expected %v, got %v", original, back)
	}
}

func TestStrToDomain(t *testing.T) {
	got := StrToDomain(pgtype.Text{String: "hello", Valid: true})
	if got != "hello" {
		t.Errorf("expected 'hello', got %q", got)
	}
}

func TestStrToDomain_invalid(t *testing.T) {
	got := StrToDomain(pgtype.Text{Valid: false})
	if got != "" {
		t.Errorf("expected empty string, got %q", got)
	}
}

func TestDomainStrPtr(t *testing.T) {
	s := "world"
	got := DomainStrPtr(&s)
	if !got.Valid {
		t.Fatal("expected valid")
	}
	if got.String != "world" {
		t.Errorf("expected 'world', got %q", got.String)
	}
}

func TestDomainStrPtr_nil(t *testing.T) {
	got := DomainStrPtr(nil)
	if got.Valid {
		t.Fatal("expected not valid for nil input")
	}
}

func TestStrRoundTrip(t *testing.T) {
	original := "test-value"
	pg := DomainStrPtr(&original)
	back := StrToDomain(pg)
	if original != back {
		t.Errorf("round trip: expected %q, got %q", original, back)
	}
}

func TestIntToDomain(t *testing.T) {
	got := IntToDomain(pgtype.Int4{Int32: 42, Valid: true})
	if got != 42 {
		t.Errorf("expected 42, got %d", got)
	}
}

func TestIntToDomain_negative(t *testing.T) {
	got := IntToDomain(pgtype.Int4{Int32: -5, Valid: true})
	if got != -5 {
		t.Errorf("expected -5, got %d", got)
	}
}

func TestIntToDomain_invalid(t *testing.T) {
	got := IntToDomain(pgtype.Int4{Valid: false})
	if got != 0 {
		t.Errorf("expected 0, got %d", got)
	}
}

func TestBoolToDomain(t *testing.T) {
	got := BoolToDomain(pgtype.Bool{Bool: true, Valid: true})
	if got != true {
		t.Errorf("expected true, got %v", got)
	}
}

func TestBoolToDomain_false(t *testing.T) {
	got := BoolToDomain(pgtype.Bool{Bool: false, Valid: true})
	if got != false {
		t.Errorf("expected false, got %v", got)
	}
}

func TestBoolToDomain_invalid(t *testing.T) {
	got := BoolToDomain(pgtype.Bool{Valid: false})
	if got != false {
		t.Errorf("expected false for invalid, got %v", got)
	}
}

func TestDomainBool(t *testing.T) {
	got := DomainBool(true)
	if !got.Valid {
		t.Fatal("expected valid")
	}
	if got.Bool != true {
		t.Errorf("expected true, got %v", got.Bool)
	}
}

func TestDomainBool_false(t *testing.T) {
	got := DomainBool(false)
	if !got.Valid {
		t.Fatal("expected valid")
	}
	if got.Bool != false {
		t.Errorf("expected false, got %v", got.Bool)
	}
}

func TestBoolRoundTrip(t *testing.T) {
	original := true
	pg := DomainBool(original)
	back := BoolToDomain(pg)
	if original != back {
		t.Errorf("round trip: expected %v, got %v", original, back)
	}
}

func TestStrPtrToDomain(t *testing.T) {
	got := StrPtrToDomain(pgtype.Text{String: "hello", Valid: true})
	if got == nil {
		t.Fatal("expected non-nil")
	}
	if *got != "hello" {
		t.Errorf("expected 'hello', got %q", *got)
	}
}

func TestStrPtrToDomain_invalid(t *testing.T) {
	got := StrPtrToDomain(pgtype.Text{Valid: false})
	if got != nil {
		t.Errorf("expected nil, got %v", *got)
	}
}

func TestStrPtrToDomain_empty(t *testing.T) {
	got := StrPtrToDomain(pgtype.Text{String: "", Valid: true})
	if got == nil {
		t.Fatal("expected non-nil for empty valid string")
	}
	if *got != "" {
		t.Errorf("expected empty string, got %q", *got)
	}
}

func TestDomainStrPtrOrNil(t *testing.T) {
	s := "hello"
	got := DomainStrPtrOrNil(&s)
	if !got.Valid {
		t.Fatal("expected valid")
	}
	if got.String != "hello" {
		t.Errorf("expected 'hello', got %q", got.String)
	}
}

func TestDomainStrPtrOrNil_nil(t *testing.T) {
	got := DomainStrPtrOrNil(nil)
	if got.Valid {
		t.Fatal("expected not valid for nil input")
	}
}

func TestStrPtrOrNilRoundTrip(t *testing.T) {
	original := "round-trip-value"
	pg := DomainStrPtrOrNil(&original)
	back := StrPtrToDomain(pg)
	if back == nil {
		t.Fatal("expected non-nil")
	}
	if *back != original {
		t.Errorf("round trip: expected %q, got %q", original, *back)
	}
}

func TestDomainStrPtrOrNil_equivalentToDomainStrPtr(t *testing.T) {
	s := "test"
	a := DomainStrPtr(&s)
	b := DomainStrPtrOrNil(&s)
	if a.Valid != b.Valid {
		t.Errorf("valid mismatch: %v vs %v", a.Valid, b.Valid)
	}
	if a.String != b.String {
		t.Errorf("string mismatch: %q vs %q", a.String, b.String)
	}
}

func TestDomainStrPtrOrNil_nilEquivalentToDomainStrPtrNil(t *testing.T) {
	a := DomainStrPtr(nil)
	b := DomainStrPtrOrNil(nil)
	if a.Valid != b.Valid {
		t.Errorf("valid mismatch: %v vs %v", a.Valid, b.Valid)
	}
}
