package domain

import "testing"

// --- ContentStatus tests ---

func TestContentStatus_ValidTransition_BuildingToReview(t *testing.T) {
	if !ContentBuilding.CanTransitionTo(ContentReview) {
		t.Error("building → review should be allowed")
	}
}

func TestContentStatus_ValidTransition_ReviewToBuilding(t *testing.T) {
	if !ContentReview.CanTransitionTo(ContentBuilding) {
		t.Error("review → building should be allowed")
	}
}

func TestContentStatus_ValidTransition_ReviewToReady(t *testing.T) {
	if !ContentReview.CanTransitionTo(ContentReady) {
		t.Error("review → ready should be allowed")
	}
}

func TestContentStatus_ValidTransition_ReadyToBuilding(t *testing.T) {
	if !ContentReady.CanTransitionTo(ContentBuilding) {
		t.Error("ready → building should be allowed")
	}
}

func TestContentStatus_ValidTransition_ReadyToPublished(t *testing.T) {
	if !ContentReady.CanTransitionTo(ContentPublished) {
		t.Error("ready → published should be allowed")
	}
}

func TestContentStatus_ValidTransition_PublishedToBuilding(t *testing.T) {
	if !ContentPublished.CanTransitionTo(ContentBuilding) {
		t.Error("published → building (reopen) should be allowed")
	}
}

func TestContentStatus_InvalidTransition_BuildingToReady(t *testing.T) {
	if ContentBuilding.CanTransitionTo(ContentReady) {
		t.Error("building → ready should NOT be allowed (skips review)")
	}
}

func TestContentStatus_InvalidTransition_BuildingToPublished(t *testing.T) {
	if ContentBuilding.CanTransitionTo(ContentPublished) {
		t.Error("building → published should NOT be allowed (skips review+ready)")
	}
}

func TestContentStatus_InvalidTransition_ReviewToPublished(t *testing.T) {
	if ContentReview.CanTransitionTo(ContentPublished) {
		t.Error("review → published should NOT be allowed (skips ready)")
	}
}

func TestContentStatus_InvalidTransition_BuildingToBuilding(t *testing.T) {
	if ContentBuilding.CanTransitionTo(ContentBuilding) {
		t.Error("building → building (self-transition) should NOT be allowed")
	}
}

func TestContentStatus_InvalidTransition_ReviewToReview(t *testing.T) {
	if ContentReview.CanTransitionTo(ContentReview) {
		t.Error("review → review (self-transition) should NOT be allowed")
	}
}

func TestContentStatus_InvalidTransition_ReadyToReady(t *testing.T) {
	if ContentReady.CanTransitionTo(ContentReady) {
		t.Error("ready → ready (self-transition) should NOT be allowed")
	}
}

func TestContentStatus_InvalidTransition_PublishedToPublished(t *testing.T) {
	if ContentPublished.CanTransitionTo(ContentPublished) {
		t.Error("published → published (self-transition) should NOT be allowed")
	}
}

func TestContentStatus_InvalidTransition_PublishedToReview(t *testing.T) {
	if ContentPublished.CanTransitionTo(ContentReview) {
		t.Error("published → review should NOT be allowed")
	}
}

func TestContentStatus_InvalidTransition_PublishedToReady(t *testing.T) {
	if ContentPublished.CanTransitionTo(ContentReady) {
		t.Error("published → ready should NOT be allowed")
	}
}

func TestContentStatus_InvalidTransition_ReadyToReview(t *testing.T) {
	if ContentReady.CanTransitionTo(ContentReview) {
		t.Error("ready → review should NOT be allowed (already past review)")
	}
}

// --- Legacy backward-compat tests ---

func TestContentStatus_LegacyDraftMapsToBuilding(t *testing.T) {
	// draft → review should be allowed (draft normalizes to building)
	if !ContentDraft.CanTransitionTo(ContentReview) {
		t.Error("draft (legacy) → review should be allowed (normalizes to building)")
	}
}

func TestContentStatus_LegacyDiscardedIsTerminal(t *testing.T) {
	// discarded → anything should be rejected
	if ContentDiscarded.CanTransitionTo(ContentBuilding) {
		t.Error("discarded (legacy) → building should NOT be allowed (terminal)")
	}
	if ContentDiscarded.CanTransitionTo(ContentReview) {
		t.Error("discarded (legacy) → review should NOT be allowed (terminal)")
	}
	if ContentDiscarded.CanTransitionTo(ContentReady) {
		t.Error("discarded (legacy) → ready should NOT be allowed (terminal)")
	}
	if ContentDiscarded.CanTransitionTo(ContentPublished) {
		t.Error("discarded (legacy) → published should NOT be allowed (terminal)")
	}
	if ContentDiscarded.CanTransitionTo(ContentDiscarded) {
		t.Error("discarded (legacy) → discarded should NOT be allowed (self-transition)")
	}
}

// --- ValidateTransition tests ---

func TestContentStatus_ValidateTransition_ValidReturnsNil(t *testing.T) {
	err := ContentBuilding.ValidateTransition(ContentReview)
	if err != nil {
		t.Errorf("expected nil, got %v", err)
	}
}

func TestContentStatus_ValidateTransition_InvalidReturnsError(t *testing.T) {
	err := ContentBuilding.ValidateTransition(ContentReady)
	if err == nil {
		t.Fatal("expected error for building → ready, got nil")
	}
}

// --- Constants tests ---

func TestContentStatus_NewConstants(t *testing.T) {
	tests := []struct {
		status ContentStatus
		want   string
	}{
		{ContentBuilding, "building"},
		{ContentReview, "review"},
		{ContentReady, "ready"},
		{ContentPublished, "published"},
	}
	for _, tt := range tests {
		if string(tt.status) != tt.want {
			t.Errorf("ContentStatus(%s) = %q, want %q", tt.want, string(tt.status), tt.want)
		}
	}
}

func TestContentStatus_LegacyConstants(t *testing.T) {
	if string(ContentDraft) != "draft" {
		t.Errorf("ContentDraft = %q, want %q", string(ContentDraft), "draft")
	}
	if string(ContentDiscarded) != "discarded" {
		t.Errorf("ContentDiscarded = %q, want %q", string(ContentDiscarded), "discarded")
	}
}

func TestValidContentStatuses(t *testing.T) {
	all := ValidContentStatuses()
	if len(all) != 4 {
		t.Errorf("expected 4 statuses, got %d", len(all))
	}

	validSet := make(map[ContentStatus]bool, len(all))
	for _, s := range all {
		validSet[s] = true
	}

	for _, s := range []ContentStatus{ContentBuilding, ContentReview, ContentReady, ContentPublished} {
		if !validSet[s] {
			t.Errorf("expected %q to be in valid statuses", s)
		}
	}

	// Legacy statuses must NOT be in valid statuses
	if validSet[ContentDraft] {
		t.Error("ContentDraft must NOT be in ValidContentStatuses")
	}
	if validSet[ContentDiscarded] {
		t.Error("ContentDiscarded must NOT be in ValidContentStatuses")
	}
}

// --- ContentType tests ---

func TestContentType_Constants(t *testing.T) {
	tests := []struct {
		ctype ContentType
		want  string
	}{
		{ContentTypeArticle, "article"},
		{ContentTypeNewsletter, "newsletter"},
	}
	for _, tt := range tests {
		if string(tt.ctype) != tt.want {
			t.Errorf("ContentType(%s) = %q, want %q", tt.want, string(tt.ctype), tt.want)
		}
	}
}

// --- ContentProduct tests ---

func TestContentProduct_Constants(t *testing.T) {
	tests := []struct {
		product ContentProduct
		want   string
	}{
		{ProductDigest, "digest"},
		{ProductCompose, "compose"},
		{ProductNewsletter, "newsletter"},
	}
	for _, tt := range tests {
		if string(tt.product) != tt.want {
			t.Errorf("ContentProduct(%s) = %q, want %q", tt.want, string(tt.product), tt.want)
		}
	}
}

// --- ContentOrigin tests ---

func TestContentOrigin_Constants(t *testing.T) {
	tests := []struct {
		origin ContentOrigin
		want   string
	}{
		{OriginAIGenerated, "ai_generated"},
		{OriginManual, "manual"},
	}
	for _, tt := range tests {
		if string(tt.origin) != tt.want {
			t.Errorf("ContentOrigin(%s) = %q, want %q", tt.want, string(tt.origin), tt.want)
		}
	}
}

// --- Complete lifecycle path tests ---

func TestContentStatus_CompleteLifecycleForward(t *testing.T) {
	// Full forward path: building → review → ready → published
	if !ContentBuilding.CanTransitionTo(ContentReview) {
		t.Error("step 1: building → review")
	}
	if !ContentReview.CanTransitionTo(ContentReady) {
		t.Error("step 2: review → ready")
	}
	if !ContentReady.CanTransitionTo(ContentPublished) {
		t.Error("step 3: ready → published")
	}
}

func TestContentStatus_CompleteLifecycleWithRevisions(t *testing.T) {
	// building → review → building → review → ready → published
	if !ContentBuilding.CanTransitionTo(ContentReview) {
		t.Error("step 1: building → review")
	}
	if !ContentReview.CanTransitionTo(ContentBuilding) {
		t.Error("step 2: review → building (revision)")
	}
	if !ContentBuilding.CanTransitionTo(ContentReview) {
		t.Error("step 3: building → review")
	}
	if !ContentReview.CanTransitionTo(ContentReady) {
		t.Error("step 4: review → ready")
	}
	if !ContentReady.CanTransitionTo(ContentPublished) {
		t.Error("step 5: ready → published")
	}
}

func TestContentStatus_ReopenPublished(t *testing.T) {
	if !ContentPublished.CanTransitionTo(ContentBuilding) {
		t.Error("published → building (reopen) should be allowed")
	}
}

func TestContentStatus_ReopenReady(t *testing.T) {
	if !ContentReady.CanTransitionTo(ContentBuilding) {
		t.Error("ready → building (reopen for edits) should be allowed")
	}
}

// --- All invalid transitions at once ---

func TestContentStatus_AllInvalidTransitions(t *testing.T) {
	type transition struct {
		from, to ContentStatus
	}
	// These are ALL transitions that should be rejected
	invalid := []transition{
		{ContentBuilding, ContentReady},
		{ContentBuilding, ContentPublished},
		{ContentBuilding, ContentBuilding},
		{ContentReview, ContentPublished},
		{ContentReview, ContentReview},
		{ContentReady, ContentReview},
		{ContentReady, ContentReady},
		{ContentPublished, ContentReview},
		{ContentPublished, ContentReady},
		{ContentPublished, ContentPublished},
	}

	for _, tr := range invalid {
		if tr.from.CanTransitionTo(tr.to) {
			t.Errorf("%q → %q should be invalid", tr.from, tr.to)
		}
	}
}
