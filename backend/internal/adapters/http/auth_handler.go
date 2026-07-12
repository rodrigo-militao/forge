package http

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
)

// AuthHandler handles user registration and authentication.
type AuthHandler struct {
	users  ports.UserRepository
	usages ports.UsageCounterRepository
}

func NewAuthHandler(users ports.UserRepository, usages ports.UsageCounterRepository) *AuthHandler {
	return &AuthHandler{users: users, usages: usages}
}

type registerRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type authResponse struct {
	ID                      string `json:"id"`
	Email                   string `json:"email"`
	Name                    string `json:"name"`
	PlanoAtivo              bool   `json:"plano_ativo"`
	MaxActiveSources        int    `json:"max_active_sources"`
	MaxActiveInterests      int    `json:"max_active_interests"`
	RestrictSearchToSources bool   `json:"restrict_search_to_sources"`
	MaxMonthlyGenerations   int    `json:"max_monthly_generations"`
	UsageThisMonth          int    `json:"usage_this_month"`
	Locale                  string `json:"locale"`
	ThemePreference         string `json:"theme_preference"`
}

// Register creates a new user account and sets a session cookie.
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Email == "" || req.Password == "" || req.Name == "" {
		writeError(w, http.StatusBadRequest, "email, password, and name are required")
		return
	}
	if len(req.Password) < 6 {
		writeError(w, http.StatusBadRequest, "password must be at least 6 characters")
		return
	}

	existing, _ := h.users.GetByEmail(r.Context(), req.Email)
	if existing != nil {
		writeError(w, http.StatusConflict, "email already registered")
		return
	}

	hash, err := hashPassword(req.Password)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to process password")
		return
	}

	user := &domain.User{
		Email:        req.Email,
		PasswordHash: hash,
		Name:         req.Name,
		Locale:       domain.LocaleEN,
	}
	if err := h.users.Create(r.Context(), user); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create user")
		return
	}

	token, err := signToken(user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create session")
		return
	}

	setSessionCookie(w, token)
	writeJSON(w, http.StatusCreated, authResponse{
		ID:                      user.ID.String(),
		Email:                   user.Email,
		Name:                    user.Name,
		PlanoAtivo:              user.PlanoAtivo,
		MaxActiveSources:        user.MaxActiveSources,
		MaxActiveInterests:      user.MaxActiveInterests,
		RestrictSearchToSources: user.RestrictSearchToSources,
		MaxMonthlyGenerations:   user.MaxMonthlyGenerations,
		UsageThisMonth:          0,
		Locale:                  string(user.Locale),
		ThemePreference:         string(user.ThemePreference),
	})
}

// Login authenticates a user and sets a session cookie.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	user, err := h.users.GetByEmail(r.Context(), req.Email)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			writeError(w, http.StatusUnauthorized, "invalid email or password")
			return
		}
		writeError(w, http.StatusInternalServerError, "database error")
		return
	}

	if !checkPassword(req.Password, user.PasswordHash) {
		writeError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	token, err := signToken(user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create session")
		return
	}

	setSessionCookie(w, token)
	writeJSON(w, http.StatusOK, authResponse{
		ID:    user.ID.String(),
		Email: user.Email,
		Name:  user.Name,
		PlanoAtivo:              user.PlanoAtivo,
		MaxActiveSources:        user.MaxActiveSources,
		MaxActiveInterests:      user.MaxActiveInterests,
		RestrictSearchToSources: user.RestrictSearchToSources,
		MaxMonthlyGenerations:   user.MaxMonthlyGenerations,
		UsageThisMonth:          0,
		Locale:                  string(user.Locale),
		ThemePreference:         string(user.ThemePreference),
	})
}

// Logout clears the session cookie.
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	clearSessionCookie(w)
	writeJSON(w, http.StatusOK, map[string]string{"status": "logged_out"})
}

// Me returns the current authenticated user's profile.
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	user, err := h.users.GetByID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}

	usage, _ := h.usages.Get(r.Context(), userID, "")

	writeJSON(w, http.StatusOK, authResponse{
		ID:    user.ID.String(),
		Email: user.Email,
		Name:  user.Name,
		PlanoAtivo:              user.PlanoAtivo,
		MaxActiveSources:        user.MaxActiveSources,
		MaxActiveInterests:      user.MaxActiveInterests,
		RestrictSearchToSources: user.RestrictSearchToSources,
		MaxMonthlyGenerations:   user.MaxMonthlyGenerations,
		UsageThisMonth:          usage,
		Locale:                  string(user.Locale),
		ThemePreference:         string(user.ThemePreference),
	})
}

// UpdateRestrictSearch toggles whether the Digest pipeline is restricted to configured sources.
func (h *AuthHandler) UpdateRestrictSearch(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req struct {
		Restrict bool `json:"restrict"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if err := h.users.UpdateRestrictSearch(r.Context(), userID, req.Restrict); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

// UpdateThemePreference updates the user's UI theme preference.
func (h *AuthHandler) UpdateThemePreference(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req struct {
		Theme string `json:"theme"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.Theme != string(domain.ThemeDark) && req.Theme != string(domain.ThemeLight) {
		writeError(w, http.StatusBadRequest, "theme must be 'dark' or 'light'")
		return
	}
	if err := h.users.UpdateThemePreference(r.Context(), userID, domain.ThemePreference(req.Theme)); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update theme")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}
