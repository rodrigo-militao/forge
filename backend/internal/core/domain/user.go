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

// User is a tenant of the platform (ADR 0002).
type User struct {
	ID           uuid.UUID `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"` // never exposed in JSON
	Name         string    `json:"name"`
	PlanoAtivo   bool      `json:"plano_ativo"`
	Locale       Locale    `json:"locale"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
