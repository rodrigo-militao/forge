package domain

import (
	"testing"
)

func TestEditionStatus_ValidTransitions(t *testing.T) {
	t.Parallel()

	tests := []struct {
		from EditionStatus
		to   EditionStatus
		want bool
	}{
		// building → ready (manual "mark as ready")
		{EditionBuilding, EditionReady, true},
		// building → archived (manual discard)
		{EditionBuilding, EditionArchived, true},
		// ready → published (manual publish)
		{EditionReady, EditionPublished, true},
		// ready → archived (manual archive)
		{EditionReady, EditionArchived, true},
		// No self-transitions
		{EditionBuilding, EditionBuilding, false},
		{EditionReady, EditionReady, false},
		{EditionPublished, EditionPublished, false},
		{EditionArchived, EditionArchived, false},
		// No backwards transitions
		{EditionReady, EditionBuilding, false},
		{EditionPublished, EditionBuilding, false},
		{EditionPublished, EditionReady, false},
		{EditionArchived, EditionBuilding, false},
		{EditionArchived, EditionReady, false},
		{EditionArchived, EditionPublished, false},
	}

	for _, tt := range tests {
		got := tt.from.CanTransitionTo(tt.to)
		if got != tt.want {
			t.Errorf("EditionStatus(%q).CanTransitionTo(%q) = %v, want %v", tt.from, tt.to, got, tt.want)
		}
	}
}

func TestEditionStatus_ValidateTransition(t *testing.T) {
	t.Parallel()

	t.Run("valid transition returns nil", func(t *testing.T) {
		err := EditionBuilding.ValidateTransition(EditionReady)
		if err != nil {
			t.Errorf("expected nil, got %v", err)
		}
	})

	t.Run("invalid transition returns error", func(t *testing.T) {
		err := EditionPublished.ValidateTransition(EditionBuilding)
		if err == nil {
			t.Error("expected error for invalid transition, got nil")
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
