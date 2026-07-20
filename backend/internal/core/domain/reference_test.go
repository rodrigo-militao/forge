package domain

import "testing"

// --- ReferenceType tests ---

func TestReferenceType_ValidTypes(t *testing.T) {
	tests := []struct {
		rt   ReferenceType
		want string
	}{
		{ReferenceTypeArticle, "article"},
		{ReferenceTypeVideo, "video"},
		{ReferenceTypePodcast, "podcast"},
		{ReferenceTypeSocialPost, "social_post"},
		{ReferenceTypeDocument, "document"},
		{ReferenceTypeWebsite, "website"},
		{ReferenceTypeOther, "other"},
	}
	for _, tt := range tests {
		if string(tt.rt) != tt.want {
			t.Errorf("ReferenceType = %q, want %q", string(tt.rt), tt.want)
		}
		if !IsValidReferenceType(tt.rt) {
			t.Errorf("IsValidReferenceType(%q) should be true", tt.rt)
		}
	}
}

func TestIsValidReferenceType_Invalid(t *testing.T) {
	if IsValidReferenceType("book") {
		t.Error("IsValidReferenceType('book') should be false")
	}
	if IsValidReferenceType("") {
		t.Error("IsValidReferenceType('') should be false")
	}
}

// --- ValidateReference tests ---

func TestValidateReference_ValidURL(t *testing.T) {
	err := ValidateReference("https://example.com/article", ReferenceTypeArticle)
	if err != nil {
		t.Errorf("expected nil, got %v", err)
	}
}

func TestValidateReference_ValidYouTubURL(t *testing.T) {
	err := ValidateReference("https://www.youtube.com/watch?v=123", ReferenceTypeVideo)
	if err != nil {
		t.Errorf("expected nil, got %v", err)
	}
}

func TestValidateReference_EmptyURL(t *testing.T) {
	err := ValidateReference("", ReferenceTypeWebsite)
	if err == nil {
		t.Fatal("expected error for empty url")
	}
}

func TestValidateReference_RelativeURL(t *testing.T) {
	err := ValidateReference("/relative/path", ReferenceTypeArticle)
	if err == nil {
		t.Fatal("expected error for relative url")
	}
}

func TestValidateReference_NoScheme(t *testing.T) {
	err := ValidateReference("example.com/article", ReferenceTypeArticle)
	if err == nil {
		t.Fatal("expected error for url without scheme")
	}
}

func TestValidateReference_InvalidType(t *testing.T) {
	err := ValidateReference("https://example.com", "book")
	if err == nil {
		t.Fatal("expected error for invalid reference type")
	}
}
