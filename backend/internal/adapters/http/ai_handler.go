package http

import (
	"encoding/json"
	"net/http"

	"github.com/rodrigo-militao/forge/internal/core/application"
)

// AIHandler manages AI-powered editorial assistance endpoints (Sprint 4-5).
type AIHandler struct {
	svc *application.AIService
}

func NewAIHandler(svc *application.AIService) *AIHandler {
	return &AIHandler{svc: svc}
}

// Analyze runs AI analysis on an article and persists the result.
// POST /api/content/{id}/ai/analyze
func (h *AIHandler) Analyze(w http.ResponseWriter, r *http.Request) {
	contentID, ok := parseUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid content id")
		return
	}
	userID, _ := UserIDFromContext(r.Context())

	result, err := h.svc.AnalyzeArticle(r.Context(), contentID, userID)
	if err != nil {
		aiError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

// GetAnalysis returns the latest AI analysis for an article.
// GET /api/content/{id}/ai/analysis
func (h *AIHandler) GetAnalysis(w http.ResponseWriter, r *http.Request) {
	contentID, ok := parseUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid content id")
		return
	}
	userID, _ := UserIDFromContext(r.Context())

	analysis, err := h.svc.GetLatestAnalysis(r.Context(), contentID, userID)
	if err != nil {
		aiError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, analysis)
}

// ImproveText suggests an improvement for selected text.
// POST /api/content/{id}/ai/improve
func (h *AIHandler) ImproveText(w http.ResponseWriter, r *http.Request) {
	contentID, ok := parseUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid content id")
		return
	}
	userID, _ := UserIDFromContext(r.Context())

	var req struct {
		Text          string `json:"text"`
		Instruction   string `json:"instruction"`
		ContextBefore string `json:"context_before"`
		ContextAfter  string `json:"context_after"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}

	suggestion, err := h.svc.ImproveText(r.Context(), contentID, userID, req.Text, req.Instruction, req.ContextBefore, req.ContextAfter)
	if err != nil {
		aiError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, suggestion)
}

// aiError maps AIService errors to HTTP status codes.
func aiError(w http.ResponseWriter, err error) {
	writeDomainError(w, err)
}
