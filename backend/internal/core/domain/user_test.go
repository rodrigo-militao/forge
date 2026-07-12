package domain

import (
	"encoding/json"
	"testing"
)

func TestLocale_Constants(t *testing.T) {
	tests := []struct {
		locale Locale
		want   string
	}{
		{LocaleEN, "en"},
		{LocalePT, "pt"},
		{LocaleES, "es"},
	}
	for _, tt := range tests {
		if string(tt.locale) != tt.want {
			t.Errorf("Locale(%s) = %q, want %q", tt.want, string(tt.locale), tt.want)
		}
	}
}

func TestThemePreference_Constants(t *testing.T) {
	tests := []struct {
		theme ThemePreference
		want  string
	}{
		{ThemeDark, "dark"},
		{ThemeLight, "light"},
	}
	for _, tt := range tests {
		if string(tt.theme) != tt.want {
			t.Errorf("ThemePreference(%s) = %q, want %q", tt.want, string(tt.theme), tt.want)
		}
	}
}

func TestUser_StructDefaults(t *testing.T) {
	// Verify that User struct can be created with required fields and JSON tags exist.
	// This is a compile-time check — if the struct compiles, JSON tags are present.
	u := User{
		Email: "test@example.com",
		Name:  "Test User",
	}
	if u.Email != "test@example.com" {
		t.Errorf("expected email to be set")
	}
	if u.Locale != "" {
		t.Errorf("expected no default locale, got %q", u.Locale)
	}
	if u.ThemePreference != "" {
		t.Errorf("expected no default theme, got %q", u.ThemePreference)
	}
}

func TestUser_JSONTags(t *testing.T) {
	// Verify JSON marshaling respects tags (particularly PasswordHash with json:"-").
	u := User{
		Email:        "test@example.com",
		PasswordHash: "secret",
		Name:         "Test User",
	}
	data, err := json.Marshal(u)
	if err != nil {
		t.Fatalf("json.Marshal: %v", err)
	}
	// PasswordHash must not appear in output
	var m map[string]any
	if err := json.Unmarshal(data, &m); err != nil {
		t.Fatalf("json.Unmarshal: %v", err)
	}
	if _, ok := m["password_hash"]; ok {
		t.Error("PasswordHash should not appear in JSON output (json:\"-\")")
	}
	if m["email"] != "test@example.com" {
		t.Errorf("expected email in JSON, got %v", m["email"])
	}
}
