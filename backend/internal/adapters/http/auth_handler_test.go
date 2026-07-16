package http

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/rodrigo-militao/forge/internal/core/domain"
	"golang.org/x/crypto/bcrypt"
)

// --- mocks ---

type mockUserRepo struct {
	users                    []domain.User
	createErr                error
	getByEmailErr            error
	getByIDErr               error
	updateRestrictSearchErr  error
	updateThemePreferenceErr error
}

func (m *mockUserRepo) Create(ctx context.Context, user *domain.User) error {
	if m.createErr != nil {
		return m.createErr
	}
	user.ID = uuid.New()
	m.users = append(m.users, *user)
	return nil
}

func (m *mockUserRepo) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	if m.getByEmailErr != nil {
		return nil, m.getByEmailErr
	}
	for _, u := range m.users {
		if u.Email == email {
			return &u, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (m *mockUserRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	if m.getByIDErr != nil {
		return nil, m.getByIDErr
	}
	for _, u := range m.users {
		if u.ID == id {
			return &u, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (m *mockUserRepo) CountActiveSources(ctx context.Context, userID uuid.UUID) (int, error) {
	return 0, nil
}

func (m *mockUserRepo) CountActiveInterests(ctx context.Context, userID uuid.UUID) (int, error) {
	return 0, nil
}

func (m *mockUserRepo) UpdateRestrictSearch(ctx context.Context, userID uuid.UUID, restrict bool) error {
	if m.updateRestrictSearchErr != nil {
		return m.updateRestrictSearchErr
	}
	for i, u := range m.users {
		if u.ID == userID {
			m.users[i].RestrictSearchToSources = restrict
			return nil
		}
	}
	return domain.ErrNotFound
}

func (m *mockUserRepo) UpdateThemePreference(ctx context.Context, userID uuid.UUID, theme domain.ThemePreference) error {
	if m.updateThemePreferenceErr != nil {
		return m.updateThemePreferenceErr
	}
	for i, u := range m.users {
		if u.ID == userID {
			m.users[i].ThemePreference = theme
			return nil
		}
	}
	return domain.ErrNotFound
}

type mockUsageRepo struct {
	usage int
	err   error
}

func (m *mockUsageRepo) Get(ctx context.Context, userID uuid.UUID, month string) (int, error) {
	return m.usage, m.err
}

func (m *mockUsageRepo) Increment(ctx context.Context, userID uuid.UUID, month string) (int, error) {
	return m.usage + 1, nil
}

// --- helpers ---

func hashPasswordForTest(password string) string {
	h, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		panic(err)
	}
	return string(h)
}

// --- Register ---

func TestAuthHandler_Register(t *testing.T) {
	InitJWT("test-secret")

	tests := []struct {
		name       string
		body       string
		repo       *mockUserRepo
		wantStatus int
		wantErr    string
	}{
		{
			name:       "success",
			body:       `{"email":"test@example.com","password":"secret123","name":"Test User"}`,
			repo:       &mockUserRepo{},
			wantStatus: http.StatusCreated,
		},
		{
			name:       "invalid JSON body",
			body:       `not-json`,
			repo:       &mockUserRepo{},
			wantStatus: http.StatusBadRequest,
			wantErr:    "invalid request body",
		},
		{
			name:       "missing email",
			body:       `{"password":"secret123","name":"Test"}`,
			repo:       &mockUserRepo{},
			wantStatus: http.StatusBadRequest,
			wantErr:    "email is required",
		},
		{
			name:       "missing password",
			body:       `{"email":"test@example.com","name":"Test"}`,
			repo:       &mockUserRepo{},
			wantStatus: http.StatusBadRequest,
			wantErr:    "password is required",
		},
		{
			name:       "missing name",
			body:       `{"email":"test@example.com","password":"secret123"}`,
			repo:       &mockUserRepo{},
			wantStatus: http.StatusBadRequest,
			wantErr:    "name is required",
		},
		{
			name:       "password too short",
			body:       `{"email":"test@example.com","password":"12345","name":"Test"}`,
			repo:       &mockUserRepo{},
			wantStatus: http.StatusBadRequest,
			wantErr:    "password must be at least 6 characters",
		},
		{
			name:       "email already registered",
			body:       `{"email":"existing@example.com","password":"secret123","name":"Test"}`,
			repo:       &mockUserRepo{users: []domain.User{{Email: "existing@example.com"}}},
			wantStatus: http.StatusConflict,
			wantErr:    "email already registered",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := NewAuthHandler(tt.repo, &mockUsageRepo{})
			w := httptest.NewRecorder()
			r := httptest.NewRequest(http.MethodPost, "/api/auth/register", strings.NewReader(tt.body))
			h.Register(w, r)

			if w.Code != tt.wantStatus {
				t.Errorf("expected status %d, got %d: %s", tt.wantStatus, w.Code, w.Body.String())
			}

			if tt.wantErr != "" {
				var errResp apiError
				json.NewDecoder(w.Body).Decode(&errResp)
				if errResp.Error != tt.wantErr {
					t.Errorf("expected error %q, got %q", tt.wantErr, errResp.Error)
				}
			} else {
				var resp authResponse
				json.NewDecoder(w.Body).Decode(&resp)
				if resp.ID == "" {
					t.Error("expected non-empty user ID")
				}
				if resp.Email != "test@example.com" {
					t.Errorf("expected email test@example.com, got %s", resp.Email)
				}
				if resp.Name != "Test User" {
					t.Errorf("expected name Test User, got %s", resp.Name)
				}
				cookie := w.Header().Get("Set-Cookie")
				if cookie == "" {
					t.Error("expected Set-Cookie header")
				}
			}
		})
	}
}

func TestAuthHandler_Register_CreateError(t *testing.T) {
	InitJWT("test-secret")

	h := NewAuthHandler(&mockUserRepo{createErr: errors.New("db error")}, &mockUsageRepo{})
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/api/auth/register", strings.NewReader(`{"email":"test@example.com","password":"secret123","name":"Test"}`))
	h.Register(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
	var resp apiError
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.Error != "failed to create user" {
		t.Errorf("expected 'failed to create user', got %q", resp.Error)
	}
}

// --- Login ---

func TestAuthHandler_Login(t *testing.T) {
	InitJWT("test-secret")
	hashed := hashPasswordForTest("correct-password")

	tests := []struct {
		name       string
		body       string
		repo       *mockUserRepo
		wantStatus int
		wantErr    string
	}{
		{
			name:       "success",
			body:       `{"email":"user@example.com","password":"correct-password"}`,
			repo:       &mockUserRepo{users: []domain.User{{Email: "user@example.com", PasswordHash: hashed, Name: "Test User"}}},
			wantStatus: http.StatusOK,
		},
		{
			name:       "invalid JSON body",
			body:       `not-json`,
			repo:       &mockUserRepo{},
			wantStatus: http.StatusBadRequest,
			wantErr:    "invalid request body",
		},
		{
			name:       "email not found",
			body:       `{"email":"unknown@example.com","password":"somepass"}`,
			repo:       &mockUserRepo{},
			wantStatus: http.StatusUnauthorized,
			wantErr:    "invalid email or password",
		},
		{
			name:       "wrong password",
			body:       `{"email":"user@example.com","password":"wrong-password"}`,
			repo:       &mockUserRepo{users: []domain.User{{Email: "user@example.com", PasswordHash: hashed}}},
			wantStatus: http.StatusUnauthorized,
			wantErr:    "invalid email or password",
		},
		{
			name:       "database error",
			body:       `{"email":"user@example.com","password":"somepass"}`,
			repo:       &mockUserRepo{getByEmailErr: errors.New("db connection failed")},
			wantStatus: http.StatusInternalServerError,
			wantErr:    "database error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := NewAuthHandler(tt.repo, &mockUsageRepo{})
			w := httptest.NewRecorder()
			r := httptest.NewRequest(http.MethodPost, "/api/auth/login", strings.NewReader(tt.body))
			h.Login(w, r)

			if w.Code != tt.wantStatus {
				t.Errorf("expected status %d, got %d: %s", tt.wantStatus, w.Code, w.Body.String())
			}

			if tt.wantErr != "" {
				var errResp apiError
				json.NewDecoder(w.Body).Decode(&errResp)
				if errResp.Error != tt.wantErr {
					t.Errorf("expected error %q, got %q", tt.wantErr, errResp.Error)
				}
			} else {
				var resp authResponse
				json.NewDecoder(w.Body).Decode(&resp)
				if resp.ID == "" {
					t.Error("expected non-empty user ID")
				}
				if resp.Email != "user@example.com" {
					t.Errorf("expected email user@example.com, got %s", resp.Email)
				}
				if resp.Name != "Test User" {
					t.Errorf("expected name Test User, got %s", resp.Name)
				}
				cookie := w.Header().Get("Set-Cookie")
				if cookie == "" {
					t.Error("expected Set-Cookie header")
				}
			}
		})
	}
}

// --- Logout ---

func TestAuthHandler_Logout(t *testing.T) {
	h := NewAuthHandler(&mockUserRepo{}, &mockUsageRepo{})
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/api/auth/logout", nil)
	h.Logout(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["status"] != "logged_out" {
		t.Errorf("expected status logged_out, got %s", resp["status"])
	}

	cookie := w.Header().Get("Set-Cookie")
	if cookie == "" {
		t.Fatal("expected Set-Cookie header")
	}
	if !strings.Contains(cookie, "Max-Age=0") && !strings.Contains(cookie, "Max-Age=-1") {
		t.Errorf("expected cookie to be cleared (Max-Age<=0), got %s", cookie)
	}
}

// --- Me ---

func TestAuthHandler_Me(t *testing.T) {
	uid := uuid.New()
	user := domain.User{
		ID:    uid,
		Email: "me@example.com",
		Name:  "Test User",
	}

	tests := []struct {
		name       string
		userID     uuid.UUID
		repo       *mockUserRepo
		usageRepo  *mockUsageRepo
		wantStatus int
		wantErr    string
	}{
		{
			name:       "no user ID in context",
			userID:     uuid.Nil,
			repo:       &mockUserRepo{},
			usageRepo:  &mockUsageRepo{},
			wantStatus: http.StatusUnauthorized,
			wantErr:    "not authenticated",
		},
		{
			name:       "user not found",
			userID:     uid,
			repo:       &mockUserRepo{},
			usageRepo:  &mockUsageRepo{},
			wantStatus: http.StatusNotFound,
			wantErr:    "user not found",
		},
		{
			name:       "success",
			userID:     uid,
			repo:       &mockUserRepo{users: []domain.User{user}},
			usageRepo:  &mockUsageRepo{usage: 5},
			wantStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := NewAuthHandler(tt.repo, tt.usageRepo)
			w := httptest.NewRecorder()
			r := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
			if tt.userID != uuid.Nil {
				r = r.WithContext(context.WithValue(r.Context(), userIDKey, tt.userID))
			}
			h.Me(w, r)

			if w.Code != tt.wantStatus {
				t.Errorf("expected status %d, got %d: %s", tt.wantStatus, w.Code, w.Body.String())
			}

			if tt.wantErr != "" {
				var errResp apiError
				json.NewDecoder(w.Body).Decode(&errResp)
				if errResp.Error != tt.wantErr {
					t.Errorf("expected error %q, got %q", tt.wantErr, errResp.Error)
				}
			} else {
				var resp authResponse
				json.NewDecoder(w.Body).Decode(&resp)
				if resp.ID != uid.String() {
					t.Errorf("expected ID %s, got %s", uid.String(), resp.ID)
				}
				if resp.Email != "me@example.com" {
					t.Errorf("expected email me@example.com, got %s", resp.Email)
				}
				if resp.UsageThisMonth != 5 {
					t.Errorf("expected usage 5, got %d", resp.UsageThisMonth)
				}
			}
		})
	}
}

// --- UpdateRestrictSearch ---

func TestAuthHandler_UpdateRestrictSearch(t *testing.T) {
	uid := uuid.New()
	user := domain.User{
		ID:    uid,
		Email: "user@example.com",
	}

	tests := []struct {
		name       string
		userID     uuid.UUID
		body       string
		repo       *mockUserRepo
		wantStatus int
		wantErr    string
	}{
		{
			name:       "no user ID in context",
			userID:     uuid.Nil,
			body:       `{"restrict":true}`,
			repo:       &mockUserRepo{},
			wantStatus: http.StatusUnauthorized,
			wantErr:    "unauthorized",
		},
		{
			name:       "invalid JSON body",
			userID:     uid,
			body:       `not-json`,
			repo:       &mockUserRepo{users: []domain.User{user}},
			wantStatus: http.StatusBadRequest,
			wantErr:    "invalid body",
		},
		{
			name:       "update fails",
			userID:     uid,
			body:       `{"restrict":true}`,
			repo:       &mockUserRepo{users: []domain.User{user}, updateRestrictSearchErr: errors.New("db error")},
			wantStatus: http.StatusInternalServerError,
			wantErr:    "failed to update",
		},
		{
			name:       "success",
			userID:     uid,
			body:       `{"restrict":true}`,
			repo:       &mockUserRepo{users: []domain.User{user}},
			wantStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := NewAuthHandler(tt.repo, &mockUsageRepo{})
			w := httptest.NewRecorder()
			r := httptest.NewRequest(http.MethodPut, "/api/auth/restrict-search", strings.NewReader(tt.body))
			if tt.userID != uuid.Nil {
				r = r.WithContext(context.WithValue(r.Context(), userIDKey, tt.userID))
			}
			h.UpdateRestrictSearch(w, r)

			if w.Code != tt.wantStatus {
				t.Errorf("expected status %d, got %d: %s", tt.wantStatus, w.Code, w.Body.String())
			}

			if tt.wantErr != "" {
				var errResp apiError
				json.NewDecoder(w.Body).Decode(&errResp)
				if errResp.Error != tt.wantErr {
					t.Errorf("expected error %q, got %q", tt.wantErr, errResp.Error)
				}
			}
		})
	}
}

// --- UpdateThemePreference ---

func TestAuthHandler_UpdateThemePreference(t *testing.T) {
	uid := uuid.New()
	user := domain.User{
		ID:    uid,
		Email: "user@example.com",
	}

	tests := []struct {
		name       string
		userID     uuid.UUID
		body       string
		repo       *mockUserRepo
		wantStatus int
		wantErr    string
	}{
		{
			name:       "no user ID in context",
			userID:     uuid.Nil,
			body:       `{"theme":"dark"}`,
			repo:       &mockUserRepo{},
			wantStatus: http.StatusUnauthorized,
			wantErr:    "unauthorized",
		},
		{
			name:       "invalid JSON body",
			userID:     uid,
			body:       `not-json`,
			repo:       &mockUserRepo{users: []domain.User{user}},
			wantStatus: http.StatusBadRequest,
			wantErr:    "invalid body",
		},
		{
			name:       "invalid theme",
			userID:     uid,
			body:       `{"theme":"blue"}`,
			repo:       &mockUserRepo{users: []domain.User{user}},
			wantStatus: http.StatusBadRequest,
			wantErr:    "theme must be 'dark' or 'light'",
		},
		{
			name:       "update fails",
			userID:     uid,
			body:       `{"theme":"dark"}`,
			repo:       &mockUserRepo{users: []domain.User{user}, updateThemePreferenceErr: errors.New("db error")},
			wantStatus: http.StatusInternalServerError,
			wantErr:    "failed to update theme",
		},
		{
			name:       "success",
			userID:     uid,
			body:       `{"theme":"dark"}`,
			repo:       &mockUserRepo{users: []domain.User{user}},
			wantStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := NewAuthHandler(tt.repo, &mockUsageRepo{})
			w := httptest.NewRecorder()
			r := httptest.NewRequest(http.MethodPut, "/api/auth/theme", strings.NewReader(tt.body))
			if tt.userID != uuid.Nil {
				r = r.WithContext(context.WithValue(r.Context(), userIDKey, tt.userID))
			}
			h.UpdateThemePreference(w, r)

			if w.Code != tt.wantStatus {
				t.Errorf("expected status %d, got %d: %s", tt.wantStatus, w.Code, w.Body.String())
			}

			if tt.wantErr != "" {
				var errResp apiError
				json.NewDecoder(w.Body).Decode(&errResp)
				if errResp.Error != tt.wantErr {
					t.Errorf("expected error %q, got %q", tt.wantErr, errResp.Error)
				}
			}
		})
	}
}
