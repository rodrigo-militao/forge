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

// QuotaRemaining returns the number of remaining monthly generations.
// Returns (remaining, false) if within quota, (0, true) if exceeded.
func (u *User) QuotaRemaining(used int) (int, bool) {
	if used >= u.MaxMonthlyGenerations {
		return 0, true
	}
	return u.MaxMonthlyGenerations - used, false
}

// CanEnableSource returns true if the user can enable another source.
func (u *User) CanEnableSource(enabledCount int) bool {
	return enabledCount < u.MaxActiveSources
}

// CanEnableInterest returns true if the user can enable another interest.
func (u *User) CanEnableInterest(enabledCount int) bool {
	return enabledCount < u.MaxActiveInterests
}
