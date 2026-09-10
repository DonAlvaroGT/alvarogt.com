package main

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"
)

var errInvalidToken = errors.New("invalid token")

const sessionTTL = 12 * time.Hour

type TokenVerifier interface {
	VerifyIDToken(ctx context.Context, idToken string) (email string, err error)
}

type mapVerifier map[string]string

func (m mapVerifier) VerifyIDToken(_ context.Context, idToken string) (string, error) {
	email, ok := m[idToken]
	if !ok || email == "" {
		return "", errInvalidToken
	}
	return email, nil
}

type Server struct {
	verifier  TokenVerifier
	allowlist map[string]struct{}
	secret    []byte
	secure    bool
	mux       *http.ServeMux
}

func newTestServer() http.Handler {
	s := NewServer(mapVerifier{
		"token-intruso": "intruso@example.com",
		"token-alvaro":  "agarciatimon@gmail.com",
		"token-luz":     "luzolivas@gmail.com",
	}, []string{"agarciatimon@gmail.com", "luzolivas@gmail.com"}, []byte("test-session-secret"), false)
	s.mux.Handle("/data.json", s.RequireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"ok":true}`))
	})))
	return s
}

func NewServer(verifier TokenVerifier, allowed []string, secret []byte, secureCookie bool) *Server {
	allow := make(map[string]struct{}, len(allowed))
	for _, email := range allowed {
		allow[strings.ToLower(strings.TrimSpace(email))] = struct{}{}
	}
	s := &Server{
		verifier:  verifier,
		allowlist: allow,
		secret:    secret,
		secure:    secureCookie,
		mux:       http.NewServeMux(),
	}
	s.mux.HandleFunc("POST /login", s.handleLogin)
	s.mux.HandleFunc("POST /logout", s.handleLogout)
	return s
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mux.ServeHTTP(w, r)
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	idToken := extractIDToken(r)
	if idToken == "" {
		writeError(w, http.StatusUnauthorized, "falta el token")
		return
	}
	email, err := s.verifier.VerifyIDToken(r.Context(), idToken)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "token no válido")
		return
	}
	email = strings.ToLower(strings.TrimSpace(email))
	if _, ok := s.allowlist[email]; !ok {
		writeError(w, http.StatusForbidden, "email no permitido")
		return
	}
	token, err := signSession(s.secret, email, time.Now(), sessionTTL)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "no se pudo crear la sesión")
		return
	}
	setSessionCookie(w, token, sessionTTL, s.secure)
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"email": email})
}

func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   s.secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"ok": "1"})
}

func extractIDToken(r *http.Request) string {
	if auth := r.Header.Get("Authorization"); len(auth) >= 7 && strings.EqualFold(auth[:7], "bearer ") {
		return strings.TrimSpace(auth[7:])
	}
	if t := strings.TrimSpace(r.Header.Get("X-Firebase-ID-Token")); t != "" {
		return t
	}
	if r.Body == nil {
		return ""
	}
	defer r.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil || len(raw) == 0 {
		return ""
	}
	var body struct {
		IDToken string `json:"idToken"`
		Token   string `json:"token"`
	}
	if err := json.Unmarshal(raw, &body); err != nil {
		return ""
	}
	if body.IDToken != "" {
		return strings.TrimSpace(body.IDToken)
	}
	return strings.TrimSpace(body.Token)
}

func writeError(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
