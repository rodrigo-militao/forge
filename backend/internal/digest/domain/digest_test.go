package domain

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestDigest_ApplyFilter(t *testing.T) {
	t.Parallel()

	t.Run("limits high items when exceeding max", func(t *testing.T) {
		d := &Digest{
			Date:   time.Now(),
			UserID: uuid.New(),
			HighItems: []DigestItem{
				{Title: "A1", Score: 5, Status: ItemPending},
				{Title: "A2", Score: 5, Status: ItemPending},
				{Title: "A3", Score: 5, Status: ItemPending},
			},
			MediumItems: []DigestItem{
				{Title: "B1", Score: 4, Status: ItemPending},
			},
		}

		d.ApplyFilter(FilterConfig{MaxItemsPerDigest: 2})
		if len(d.HighItems) != 2 {
			t.Errorf("expected 2 high items, got %d", len(d.HighItems))
		}
		if len(d.MediumItems) != 1 {
			t.Errorf("expected 1 medium item (remaining capacity), got %d", len(d.MediumItems))
		}
	})

	t.Run("fills remaining slots with medium items", func(t *testing.T) {
		d := &Digest{
			HighItems:   []DigestItem{{Title: "A1", Score: 5, Status: ItemPending}},
			MediumItems: []DigestItem{{Title: "B1", Score: 4, Status: ItemPending}, {Title: "B2", Score: 4, Status: ItemPending}},
		}
		d.ApplyFilter(FilterConfig{MaxItemsPerDigest: 2})
		if len(d.MediumItems) != 1 {
			t.Errorf("expected 1 medium item after filling 1 remaining slot, got %d", len(d.MediumItems))
		}
	})

	t.Run("zero max leaves digest unchanged", func(t *testing.T) {
		d := &Digest{
			HighItems:   []DigestItem{{Title: "A1", Score: 5, Status: ItemPending}},
			MediumItems: []DigestItem{{Title: "B1", Score: 4, Status: ItemPending}},
		}
		d.ApplyFilter(FilterConfig{})
		if len(d.HighItems) != 1 || len(d.MediumItems) != 1 {
			t.Errorf("expected unchanged lengths")
		}
	})
}
