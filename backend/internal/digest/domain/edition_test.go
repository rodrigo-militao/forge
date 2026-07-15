package domain

import (
	"testing"
)

func TestEditionStatus_CanTransitionTo_AllCrossStatuses(t *testing.T) {
	t.Parallel()

	statuses := []EditionStatus{EditionBuilding, EditionReady, EditionPublished, EditionArchived}

	for _, from := range statuses {
		for _, to := range statuses {
			got := from.CanTransitionTo(to)
			if from == to && got {
				t.Errorf("EditionStatus(%q).CanTransitionTo(%q) = true, want false (self-transition)", from, to)
			}
			if from != to && !got {
				t.Errorf("EditionStatus(%q).CanTransitionTo(%q) = false, want true (cross-status)", from, to)
			}
		}
	}
}

func TestEditionStatus_ValidateTransition(t *testing.T) {
	t.Parallel()

	t.Run("valid cross-status returns nil", func(t *testing.T) {
		err := EditionBuilding.ValidateTransition(EditionReady)
		if err != nil {
			t.Errorf("expected nil, got %v", err)
		}
	})

	t.Run("self-transition returns error", func(t *testing.T) {
		err := EditionPublished.ValidateTransition(EditionPublished)
		if err == nil {
			t.Error("expected error for self-transition, got nil")
		}
	})
}

func TestEditionStatus_Constants(t *testing.T) {
	t.Parallel()

	tests := []struct {
		status EditionStatus
		want   string
	}{
		{EditionBuilding, "building"},
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

	for _, s := range []EditionStatus{EditionBuilding, EditionReady, EditionPublished, EditionArchived} {
		if !validSet[s] {
			t.Errorf("expected %q to be in valid statuses", s)
		}
	}
}
