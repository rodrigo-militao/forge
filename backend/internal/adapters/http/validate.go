package http

import (
	"net/http"
	"strconv"

	"github.com/google/uuid"
)

// validateRequired checks that value is non-empty and writes a 400 if not.
// Returns true if valid.
func validateRequired(w http.ResponseWriter, value, field string) bool {
	if value == "" {
		writeError(w, http.StatusBadRequest, field+" is required")
		return false
	}
	return true
}

// validateMinLen checks that value meets a minimum length.
func validateMinLen(w http.ResponseWriter, value string, min int, field string) bool {
	if len(value) < min {
		writeError(w, http.StatusBadRequest, field+" must be at least "+strconv.Itoa(min)+" characters")
		return false
	}
	return true
}

// validateUUID parses a UUID string and returns the parsed UUID, or writes a 400.
// Returns the parsed UUID and true if valid.
func validateUUID(w http.ResponseWriter, value, field string) (uuid.UUID, bool) {
	id, err := uuid.Parse(value)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid "+field)
		return uuid.UUID{}, false
	}
	return id, true
}
