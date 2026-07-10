package domain

import (
	"time"

	"github.com/google/uuid"
)

// ItemStatus tracks the approval state of a digest item.
type ItemStatus int

const (
	ItemPending  ItemStatus = iota
	ItemApproved
	ItemRejected
)

// DigestItem is a single entry within a digest.
type DigestItem struct {
	Title      string
	URL        string
	SourceName string
	Score      int    // 1-5
	Summary    string
	WhyInclude string
	Status     ItemStatus
}

// Digest is the output of a single discovery run for a tenant.
type Digest struct {
	Date        time.Time
	UserID      uuid.UUID
	HighItems   []DigestItem
	MediumItems []DigestItem
	GeneratedAt time.Time
}

// ApplyFilter trims the digest to the configured limits.
func (d *Digest) ApplyFilter(cfg FilterConfig) {
	if cfg.MaxItemsPerDigest > 0 {
		if len(d.HighItems) > cfg.MaxItemsPerDigest {
			d.HighItems = d.HighItems[:cfg.MaxItemsPerDigest]
		}
		remaining := cfg.MaxItemsPerDigest - len(d.HighItems)
		if remaining > 0 && len(d.MediumItems) > remaining {
			d.MediumItems = d.MediumItems[:remaining]
		}
	}
}
