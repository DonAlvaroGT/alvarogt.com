package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"
)

const sessionCookieName = "go_session"

var errBadSession = errors.New("sesión no válida")

type sessionClaims struct {
	Email string `json:"email"`
	Exp   int64  `json:"exp"`
}

func signSession(secret []byte, email string, now time.Time, ttl time.Duration) (string, error) {
	claims := sessionClaims{Email: email, Exp: now.Add(ttl).Unix()}
	header := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"HS256","typ":"JWT"}`))
	payload, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}
	body := header + "." + base64.RawURLEncoding.EncodeToString(payload)
	mac := hmac.New(sha256.New, secret)
	_, _ = mac.Write([]byte(body))
	sig := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	return body + "." + sig, nil
}

func parseSession(secret []byte, token string, now time.Time) (string, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return "", errBadSession
	}
	body := parts[0] + "." + parts[1]
	mac := hmac.New(sha256.New, secret)
	_, _ = mac.Write([]byte(body))
	want := mac.Sum(nil)
	got, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil || !hmac.Equal(got, want) {
		return "", errBadSession
	}
	raw, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return "", errBadSession
	}
	var claims sessionClaims
	if err := json.Unmarshal(raw, &claims); err != nil {
		return "", errBadSession
	}
	if claims.Email == "" || claims.Exp <= now.Unix() {
		return "", errBadSession
	}
	return claims.Email, nil
}

func setSessionCookie(w http.ResponseWriter, value string, ttl time.Duration, secure bool) {
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    value,
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int(ttl.Seconds()),
	})
}
