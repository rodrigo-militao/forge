package http

import (
	"log/slog"
	"net/http"

	"github.com/rodrigo-militao/forge/internal/core/ports"
	digest "github.com/rodrigo-militao/forge/internal/digest/domain"
)

// DigestHandler serves digest-specific endpoints.
type DigestHandler struct {
	content  ports.ContentRepository
	editions digest.EditionRepository
}

// NewDigestHandler creates a digest handler.
func NewDigestHandler(content ports.ContentRepository, editions digest.EditionRepository) *DigestHandler {
	return &DigestHandler{content: content, editions: editions}
}

// GetStats returns aggregate statistics for the Digest page.
func (h *DigestHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	stats, err := h.content.GetDigestStats(r.Context(), userID)
	if err != nil {
		slog.Error("digest stats: query failed", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to get stats")
		return
	}

	writeJSON(w, http.StatusOK, stats)
}
