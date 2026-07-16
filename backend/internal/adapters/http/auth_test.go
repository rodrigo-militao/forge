package http

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

func TestInitJWT(t *testing.T) {
	// Just verify it doesn't panic with a normal secret.
	InitJWT("unit-test-secret")
	if globalAuth == nil {
		t.Fatal("JWTAuthenticator should be initialized after InitJWT")
	}
}

func TestSignToken(t *testing.T) {
	InitJWT("test-secret")

	userID := uuid.New()
	tokenStr, err := signToken(userID)
	if err != nil {
		t.Fatalf("signToken() returned error: %v", err)
	}
	if tokenStr == "" {
		t.Fatal("signToken() returned empty string")
	}

	// Verify the token is parseable and contains the right claims.
	verifiedID, err := verifyToken(tokenStr)
	if err != nil {
		t.Fatalf("verifyToken(signed) returned error: %v", err)
	}
	if verifiedID != userID {
		t.Fatalf("expected userID %v, got %v", userID, verifiedID)
	}
}

func TestVerifyToken(t *testing.T) {
	InitJWT("test-secret")

	userID := uuid.New()

	t.Run("valid token", func(t *testing.T) {
		tokenStr, err := signToken(userID)
		if err != nil {
			t.Fatal(err)
		}
		got, err := verifyToken(tokenStr)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if got != userID {
			t.Fatalf("expected %v, got %v", userID, got)
		}
	})

	t.Run("expired token", func(t *testing.T) {
		claims := jwtClaims{
			UserID: userID,
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(-1 * time.Hour)),
				IssuedAt:  jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
			},
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenStr, err := token.SignedString(globalAuth.secret)
		if err != nil {
			t.Fatal(err)
		}
		_, err = verifyToken(tokenStr)
		if err == nil {
			t.Fatal("expected error for expired token")
		}
		if !strings.Contains(err.Error(), "token is expired") {
			t.Fatalf("expected 'token is expired' error, got: %v", err)
		}
	})

	t.Run("wrong signing method", func(t *testing.T) {
		// Craft a token with RS256 in the header to trigger the signing method check.
		// Use valid base64 for the signature segment so jwt.Parse can decode it.
		hdr := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"RS256","typ":"JWT"}`))
		pld := base64.RawURLEncoding.EncodeToString([]byte(`{"user_id":"` + userID.String() + `"}`))
		sig := base64.RawURLEncoding.EncodeToString([]byte("fake-signature-data"))
		tokenStr := hdr + "." + pld + "." + sig

		_, err := verifyToken(tokenStr)
		if err == nil {
			t.Fatal("expected error for wrong signing method")
		}
		if !strings.Contains(err.Error(), "unexpected signing method") {
			t.Fatalf("expected 'unexpected signing method' error, got: %v", err)
		}
	})

	t.Run("malformed token", func(t *testing.T) {
		_, err := verifyToken("not-a-valid-jwt-token")
		if err == nil {
			t.Fatal("expected error for malformed token")
		}
	})
}

func TestHashPassword(t *testing.T) {
	t.Run("returns hash for normal password", func(t *testing.T) {
		hash, err := hashPassword("my-secure-password")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if hash == "" {
			t.Fatal("hash should not be empty")
		}
		if !strings.HasPrefix(hash, "$2a$") && !strings.HasPrefix(hash, "$2b$") {
			t.Fatalf("hash does not look like bcrypt: %s", hash)
		}
	})

	t.Run("errors on password over 72 bytes", func(t *testing.T) {
		longPwd := strings.Repeat("a", 73)
		_, err := hashPassword(longPwd)
		if err == nil {
			t.Fatal("expected error for password exceeding 72 bytes")
		}
	})
}

func TestCheckPassword(t *testing.T) {
	password := "my-secure-password"
	hash, err := hashPassword(password)
	if err != nil {
		t.Fatal(err)
	}

	t.Run("correct password returns true", func(t *testing.T) {
		if !checkPassword(password, hash) {
			t.Fatal("expected true for correct password")
		}
	})

	t.Run("incorrect password returns false", func(t *testing.T) {
		if checkPassword("wrong-password", hash) {
			t.Fatal("expected false for incorrect password")
		}
	})

	t.Run("empty password returns false", func(t *testing.T) {
		if checkPassword("", hash) {
			t.Fatal("expected false for empty password")
		}
	})

	t.Run("invalid hash returns false", func(t *testing.T) {
		if checkPassword(password, "not-a-valid-hash") {
			t.Fatal("expected false for invalid hash")
		}
	})
}

func TestSetSessionCookie(t *testing.T) {
	w := httptest.NewRecorder()
	token := "my-jwt-token"

	setSessionCookie(w, token)

	cookieHeader := w.Header().Get("Set-Cookie")
	if cookieHeader == "" {
		t.Fatal("expected Set-Cookie header")
	}

	cookie, err := http.ParseSetCookie(cookieHeader)
	if err != nil {
		t.Fatalf("failed to parse cookie: %v", err)
	}

	if cookie.Name != "session" {
		t.Fatalf("expected cookie name 'session', got %q", cookie.Name)
	}
	if cookie.Value != token {
		t.Fatalf("expected cookie value %q, got %q", token, cookie.Value)
	}
	if cookie.Path != "/" {
		t.Fatalf("expected cookie path '/', got %q", cookie.Path)
	}
	if !cookie.HttpOnly {
		t.Fatal("expected cookie HttpOnly=true")
	}
	if cookie.MaxAge != 7*24*3600 {
		t.Fatalf("expected MaxAge %d, got %d", 7*24*3600, cookie.MaxAge)
	}
}

func TestClearSessionCookie(t *testing.T) {
	w := httptest.NewRecorder()

	clearSessionCookie(w)

	cookieHeader := w.Header().Get("Set-Cookie")
	if cookieHeader == "" {
		t.Fatal("expected Set-Cookie header")
	}

	cookie, err := http.ParseSetCookie(cookieHeader)
	if err != nil {
		t.Fatalf("failed to parse cookie: %v", err)
	}

	if cookie.Name != "session" {
		t.Fatalf("expected cookie name 'session', got %q", cookie.Name)
	}
	if cookie.Value != "" {
		t.Fatalf("expected empty cookie value, got %q", cookie.Value)
	}
	if cookie.MaxAge != -1 {
		t.Fatalf("expected MaxAge -1, got %d", cookie.MaxAge)
	}
}

func TestWriteJSON(t *testing.T) {
	w := httptest.NewRecorder()
	data := map[string]string{"hello": "world"}
	writeJSON(w, http.StatusOK, data)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	if ct := w.Header().Get("Content-Type"); ct != "application/json" {
		t.Fatalf("expected Content-Type application/json, got %q", ct)
	}

	var decoded map[string]string
	if err := json.NewDecoder(w.Body).Decode(&decoded); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if decoded["hello"] != "world" {
		t.Fatalf("expected hello=world, got %v", decoded)
	}
}

func TestWriteError(t *testing.T) {
	w := httptest.NewRecorder()
	writeError(w, http.StatusBadRequest, "something went wrong")

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}

	var resp apiError
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.Error != "something went wrong" {
		t.Fatalf("expected error message %q, got %q", "something went wrong", resp.Error)
	}
}

// testCodeError implements ErrorCoder for TestWriteErrorWithCode.
type testCodeError struct {
	msg  string
	code string
}

func (e *testCodeError) Error() string { return e.msg }
func (e *testCodeError) Code() string  { return e.code }

func TestWriteErrorWithCode(t *testing.T) {
	w := httptest.NewRecorder()
	err := &testCodeError{msg: "rate limited", code: "RATE_LIMIT"}
	writeErrorWithCode(w, http.StatusTooManyRequests, err)

	if w.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d", w.Code)
	}

	var resp apiError
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.Error != "rate limited" {
		t.Fatalf("expected error message %q, got %q", "rate limited", resp.Error)
	}
	if resp.Code != "RATE_LIMIT" {
		t.Fatalf("expected code %q, got %q", "RATE_LIMIT", resp.Code)
	}
}
