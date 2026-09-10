package main

import (
	"context"
	"net/http"
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

func (s *Server) RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		email, err := s.sessionEmail(r)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "no hay sesión")
			return
		}
		ctx := context.WithValue(r.Context(), emailContextKey, email)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
