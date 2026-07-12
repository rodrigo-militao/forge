package domain

import "testing"

func TestContentStatus_Constants(t *testing.T) {
	tests := []struct {
		status ContentStatus
		want   string
	}{
		{ContentDraft, "draft"},
	}
	for _, tt := range tests {
		if string(tt.status) != tt.want {
			t.Errorf("ContentStatus(%s) = %q, want %q", tt.want, string(tt.status), tt.want)
		}
	}
}

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
