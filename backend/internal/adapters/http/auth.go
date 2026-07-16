// Package http provides HTTP handlers, middleware, and router setup.
package http

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// --- context keys ---

type contextKey string

const userIDKey contextKey = "user_id"

// UserIDFromContext extracts the authenticated user's ID from context.
func UserIDFromContext(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(userIDKey).(uuid.UUID)
	return id, ok
}

// --- JWT ---

type jwtClaims struct {
	UserID uuid.UUID `json:"user_id"`
	jwt.RegisteredClaims
}

// JWTAuthenticator signs and verifies JWT tokens using a secret key.
type JWTAuthenticator struct {
	secret []byte
}

// NewJWTAuthenticator creates an authenticator with the given secret.
func NewJWTAuthenticator(secret string) *JWTAuthenticator {
	return &JWTAuthenticator{secret: []byte(secret)}
}

func (a *JWTAuthenticator) signToken(userID uuid.UUID) (string, error) {
	claims := jwtClaims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(a.secret)
}

func (a *JWTAuthenticator) verifyToken(tokenStr string) (uuid.UUID, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &jwtClaims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return a.secret, nil
	})
	if err != nil {
		return uuid.Nil, err
	}
	claims, ok := token.Claims.(*jwtClaims)
	if !ok || !token.Valid {
		return uuid.Nil, errors.New("invalid token")
	}
	return claims.UserID, nil
}

// Package-level convenience for existing callers.
// New code should create a JWTAuthenticator explicitly.
var globalAuth *JWTAuthenticator

// InitJWT initializes the package-level authenticator.
func InitJWT(secret string) {
	globalAuth = NewJWTAuthenticator(secret)
}

func signToken(userID uuid.UUID) (string, error) {
	return globalAuth.signToken(userID)
}

func verifyToken(tokenStr string) (uuid.UUID, error) {
	return globalAuth.verifyToken(tokenStr)
}

// --- password hashing ---

func hashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("hashing password: %w", err)
	}
	return string(bytes), nil
}

func checkPassword(password, hash string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

// --- cookie helpers ---

func setSessionCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   false, // true in production with HTTPS
		SameSite: http.SameSiteLaxMode,
		MaxAge:   7 * 24 * 3600,
	})
}

func clearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})
}

// --- response helpers ---

type apiError struct {
	Error string `json:"error"`
	Code  string `json:"code,omitempty"`
}

// ErrorCoder is implemented by errors that carry a machine-readable code.
type ErrorCoder interface {
	Code() string
	Error() string
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, apiError{Error: msg})
}

func writeErrorWithCode(w http.ResponseWriter, status int, err error) {
	var code string
	if coder, ok := err.(ErrorCoder); ok {
		code = coder.Code()
	}
	writeJSON(w, status, apiError{Error: err.Error(), Code: code})
}
