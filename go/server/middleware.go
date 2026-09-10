package main

import (
	"context"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type contextKey string

const emailContextKey contextKey = "email"

func (s *Server) sessionEmail(r *http.Request) (string, error) {
	c, err := r.Cookie(sessionCookieName)
	if err != nil || c.Value == "" {
		return "", errBadSession
	}
	return parseSession(s.secret, c.Value, time.Now())
}

func wantsJSON(r *http.Request) bool {
	p := r.URL.Path
	if strings.HasSuffix(p, ".json") {
		return true
	}
	accept := r.Header.Get("Accept")
	return strings.Contains(accept, "application/json") && !strings.Contains(accept, "text/html")
}

func (s *Server) RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		email, err := s.sessionEmail(r)
		if err != nil {
			if wantsJSON(r) {
				writeError(w, http.StatusUnauthorized, "no hay sesión")
				return
			}
			nextURL := "/login?next=" + url.QueryEscape(r.URL.RequestURI())
			http.Redirect(w, r, nextURL, http.StatusFound)
			return
		}
		if _, ok := s.allowlist[strings.ToLower(strings.TrimSpace(email))]; !ok {
			writeError(w, http.StatusForbidden, "email no permitido")
			return
		}
		ctx := context.WithValue(r.Context(), emailContextKey, email)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
