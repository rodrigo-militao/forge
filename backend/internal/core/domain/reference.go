package domain

import (
	"fmt"
	"net/url"
	"time"

	"github.com/google/uuid"
)

// ReferenceType identifies the kind of external source.
type ReferenceType string

const (
	ReferenceTypeArticle    ReferenceType = "article"
	ReferenceTypeVideo      ReferenceType = "video"
	ReferenceTypePodcast    ReferenceType = "podcast"
	ReferenceTypeSocialPost ReferenceType = "social_post"
	ReferenceTypeDocument   ReferenceType = "document"
	ReferenceTypeWebsite    ReferenceType = "website"
	ReferenceTypeOther      ReferenceType = "other"
)

// ValidReferenceTypes contains all accepted ReferenceType values.
var ValidReferenceTypes = []ReferenceType{
	ReferenceTypeArticle,
	ReferenceTypeVideo,
	ReferenceTypePodcast,
	ReferenceTypeSocialPost,
	ReferenceTypeDocument,
	ReferenceTypeWebsite,
	ReferenceTypeOther,
}

// IsValidReferenceType returns true if the given value is a supported type.
func IsValidReferenceType(t ReferenceType) bool {
	for _, v := range ValidReferenceTypes {
		if t == v {
			return true
		}
	}
	return false
}

// Reference represents an external source used as editorial context.
type Reference struct {
	ID            uuid.UUID     `json:"id"`
	UserID        uuid.UUID     `json:"user_id"`
	URL           string        `json:"url"`
	Title         *string       `json:"title"`
	Description   *string       `json:"description"`
	SourceName    *string       `json:"source_name"`
	ReferenceType ReferenceType `json:"reference_type"`
	CreatedAt     time.Time     `json:"created_at"`
	UpdatedAt     time.Time     `json:"updated_at"`
}

// ValidateReference returns an error if the reference input is invalid.
// It checks URL format, URL requirement, and reference type.
// It does not perform network requests.
func ValidateReference(urlStr string, refType ReferenceType) error {
	if urlStr == "" {
		return fmt.Errorf("%w: url is required", ErrInvalidInput)
	}
	parsed, err := url.Parse(urlStr)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return fmt.Errorf("%w: invalid url: %s", ErrInvalidInput, urlStr)
	}
	if !IsValidReferenceType(refType) {
		return fmt.Errorf("%w: unsupported reference type: %s", ErrInvalidInput, refType)
	}
	return nil
}
