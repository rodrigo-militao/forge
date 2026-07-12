package domain

import (
	"time"

	"github.com/google/uuid"
)

// Locale represents a supported UI language (ADR 0009).
type Locale string

const (
	LocaleEN Locale = "en"
	LocalePT Locale = "pt"
	LocaleES Locale = "es"
)

// ThemePreference represents the UI theme choice.
type ThemePreference string

const (
	ThemeDark  ThemePreference = "dark"
	ThemeLight ThemePreference = "light"
)

// User is a tenant of the platform (ADR 0002).
type User struct {
	ID                      uuid.UUID       `json:"id"`
	Email                   string          `json:"email"`
	PasswordHash            string          `json:"-"` // never exposed in JSON
	Name                    string          `json:"name"`
	PlanoAtivo              bool            `json:"plano_ativo"`
	MaxActiveSources        int             `json:"max_active_sources"`
	MaxActiveInterests      int             `json:"max_active_interests"`
	RestrictSearchToSources bool            `json:"restrict_search_to_sources"`
	MaxMonthlyGenerations   int             `json:"max_monthly_generations"`
	Locale                  Locale          `json:"locale"`
	ThemePreference         ThemePreference `json:"theme_preference"`
	CreatedAt               time.Time       `json:"created_at"`
	UpdatedAt               time.Time       `json:"updated_at"`
}
