package domain

import (
	"testing"
)

// --- Valid transitions ---

func TestEditionStatus_ValidTransition_BuildingToReview(t *testing.T) {
	t.Parallel()
	if !EditionBuilding.CanTransitionTo(EditionReview) {
		t.Error("building → review should be allowed")
	}
}

func TestEditionStatus_ValidTransition_ReviewToBuilding(t *testing.T) {
	t.Parallel()
	if !EditionReview.CanTransitionTo(EditionBuilding) {
		t.Error("review → building should be allowed")
	}
}

func TestEditionStatus_ValidTransition_ReviewToReady(t *testing.T) {
	t.Parallel()
	if !EditionReview.CanTransitionTo(EditionReady) {
		t.Error("review → ready should be allowed")
	}
}

func TestEditionStatus_ValidTransition_ReadyToBuilding(t *testing.T) {
	t.Parallel()
	if !EditionReady.CanTransitionTo(EditionBuilding) {
		t.Error("ready → building should be allowed")
	}
}

func TestEditionStatus_ValidTransition_ReadyToPublished(t *testing.T) {
	t.Parallel()
	if !EditionReady.CanTransitionTo(EditionPublished) {
		t.Error("ready → published should be allowed")
	}
}

func TestEditionStatus_ValidTransition_PublishedToBuilding(t *testing.T) {
	t.Parallel()
	if !EditionPublished.CanTransitionTo(EditionBuilding) {
		t.Error("published → building (reopen) should be allowed")
	}
}

// --- Invalid transitions ---

func TestEditionStatus_InvalidTransition_BuildingToReady(t *testing.T) {
	t.Parallel()
	if EditionBuilding.CanTransitionTo(EditionReady) {
		t.Error("building → ready should NOT be allowed (skips review)")
	}
}

func TestEditionStatus_InvalidTransition_BuildingToPublished(t *testing.T) {
	t.Parallel()
	if EditionBuilding.CanTransitionTo(EditionPublished) {
		t.Error("building → published should NOT be allowed (skips review+ready)")
	}
}

func TestEditionStatus_InvalidTransition_ReviewToPublished(t *testing.T) {
	t.Parallel()
	if EditionReview.CanTransitionTo(EditionPublished) {
		t.Error("review → published should NOT be allowed (skips ready)")
	}
}

func TestEditionStatus_InvalidTransition_SelfTransitions(t *testing.T) {
	t.Parallel()
	statuses := []EditionStatus{EditionBuilding, EditionReview, EditionReady, EditionPublished, EditionArchived}
	for _, s := range statuses {
		if s.CanTransitionTo(s) {
			t.Errorf("%q → %q (self-transition) should NOT be allowed", s, s)
		}
	}
}

func TestEditionStatus_InvalidTransition_PublishedToReview(t *testing.T) {
	t.Parallel()
	if EditionPublished.CanTransitionTo(EditionReview) {
		t.Error("published → review should NOT be allowed")
	}
}

func TestEditionStatus_InvalidTransition_PublishedToReady(t *testing.T) {
	t.Parallel()
	if EditionPublished.CanTransitionTo(EditionReady) {
		t.Error("published → ready should NOT be allowed")
	}
}

func TestEditionStatus_InvalidTransition_ReadyToReview(t *testing.T) {
	t.Parallel()
	if EditionReady.CanTransitionTo(EditionReview) {
		t.Error("ready → review should NOT be allowed")
	}
}

// --- Archived is terminal ---

func TestEditionStatus_ArchiveFlow(t *testing.T) {
	t.Parallel()
	// published → archived is allowed
	if !EditionPublished.CanTransitionTo(EditionArchived) {
		t.Error("published → archived should be allowed")
	}
	// ready → archived is allowed
	if !EditionReady.CanTransitionTo(EditionArchived) {
		t.Error("ready → archived should be allowed")
	}
	// archived → building (unarchive) is allowed
	if !EditionArchived.CanTransitionTo(EditionBuilding) {
		t.Error("archived → building (unarchive) should be allowed")
	}
	// archived → other lifecycle states is NOT allowed
	if EditionArchived.CanTransitionTo(EditionReview) {
		t.Error("archived → review should NOT be allowed")
	}
	if EditionArchived.CanTransitionTo(EditionReady) {
		t.Error("archived → ready should NOT be allowed")
	}
	if EditionArchived.CanTransitionTo(EditionPublished) {
		t.Error("archived → published should NOT be allowed")
	}
	// building → archived should NOT be allowed (building must go through review/ready/published first)
	if EditionBuilding.CanTransitionTo(EditionArchived) {
		t.Error("building → archived should NOT be allowed")
	}
	if EditionReview.CanTransitionTo(EditionArchived) {
		t.Error("review → archived should NOT be allowed")
	}
}

// --- ValidateTransition ---

func TestEditionStatus_ValidateTransition_ValidReturnsNil(t *testing.T) {
	t.Parallel()
	err := EditionBuilding.ValidateTransition(EditionReview)
	if err != nil {
		t.Errorf("expected nil, got %v", err)
	}
}

func TestEditionStatus_ValidateTransition_InvalidReturnsError(t *testing.T) {
	t.Parallel()
	err := EditionBuilding.ValidateTransition(EditionReady)
	if err == nil {
		t.Fatal("expected error for building → ready, got nil")
	}
}

// --- Constants ---

func TestEditionStatus_Constants(t *testing.T) {
	t.Parallel()
	tests := []struct {
		status EditionStatus
		want   string
	}{
		{EditionBuilding, "building"},
		{EditionReview, "review"},
		{EditionReady, "ready"},
		{EditionPublished, "published"},
		{EditionArchived, "archived"},
	}
	for _, tt := range tests {
		if string(tt.status) != tt.want {
			t.Errorf("EditionStatus(%s) = %q, want %q", tt.want, string(tt.status), tt.want)
		}
	}
}

func TestEditionStatus_ValidStatuses(t *testing.T) {
	t.Parallel()
	all := EditionValidStatuses()
	if len(all) != 4 {
		t.Errorf("expected 4 statuses, got %d", len(all))
	}

	validSet := make(map[EditionStatus]bool, len(all))
	for _, s := range all {
		validSet[s] = true
	}

	for _, s := range []EditionStatus{EditionBuilding, EditionReview, EditionReady, EditionPublished} {
		if !validSet[s] {
			t.Errorf("expected %q to be in valid statuses", s)
		}
	}

	// Archived must NOT be in valid statuses (it's legacy terminal)
	if validSet[EditionArchived] {
		t.Error("EditionArchived must NOT be in EditionValidStatuses")
	}
}

// --- Complete lifecycle ---

func TestEditionStatus_CompleteLifecycleForward(t *testing.T) {
	t.Parallel()
	if !EditionBuilding.CanTransitionTo(EditionReview) {
		t.Error("step 1: building → review")
	}
	if !EditionReview.CanTransitionTo(EditionReady) {
		t.Error("step 2: review → ready")
	}
	if !EditionReady.CanTransitionTo(EditionPublished) {
		t.Error("step 3: ready → published")
	}
}

func TestEditionStatus_CompleteLifecycleWithRevisions(t *testing.T) {
	t.Parallel()
	if !EditionBuilding.CanTransitionTo(EditionReview) {
		t.Error("step 1: building → review")
	}
	if !EditionReview.CanTransitionTo(EditionBuilding) {
		t.Error("step 2: review → building (revision)")
	}
	if !EditionBuilding.CanTransitionTo(EditionReview) {
		t.Error("step 3: building → review")
	}
	if !EditionReview.CanTransitionTo(EditionReady) {
		t.Error("step 4: review → ready")
	}
	if !EditionReady.CanTransitionTo(EditionPublished) {
		t.Error("step 5: ready → published")
	}
}

func TestEditionStatus_ReopenPublished(t *testing.T) {
	t.Parallel()
	if !EditionPublished.CanTransitionTo(EditionBuilding) {
		t.Error("published → building (reopen) should be allowed")
	}
}

// --- All invalid transitions in bulk ---

func TestEditionStatus_AllInvalidTransitions(t *testing.T) {
	t.Parallel()
	type transition struct {
		from, to EditionStatus
	}
	invalid := []transition{
		{EditionBuilding, EditionReady},
		{EditionBuilding, EditionPublished},
		{EditionBuilding, EditionArchived},
		{EditionReview, EditionPublished},
		{EditionReview, EditionArchived},
		{EditionReady, EditionReview},
		{EditionPublished, EditionReview},
		{EditionPublished, EditionReady},
	}

	for _, tr := range invalid {
		if tr.from.CanTransitionTo(tr.to) {
			t.Errorf("%q → %q should be invalid", tr.from, tr.to)
		}
	}
}
