package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func sessionCookie(cookies []*http.Cookie) *http.Cookie {
	for _, c := range cookies {
		if c.Name == sessionCookieName {
			return c
		}
	}
	return nil
}

func TestLoginWithoutTokenReturns401(t *testing.T) {
	srv := newTestServer()
	req := httptest.NewRequest(http.MethodPost, "/login", nil)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("got %d, want 401", rec.Code)
	}
}

func TestLoginUnknownEmailReturns403(t *testing.T) {
	srv := newTestServer()
	req := httptest.NewRequest(http.MethodPost, "/login", nil)
	req.Header.Set("Authorization", "Bearer token-intruso")
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("got %d, want 403", rec.Code)
	}
}

func TestLoginInvalidTokenReturns401(t *testing.T) {
	srv := newTestServer()
	req := httptest.NewRequest(http.MethodPost, "/login", nil)
	req.Header.Set("Authorization", "Bearer token-falso")
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("got %d, want 401", rec.Code)
	}
}

func TestLoginAllowlistedEmailSetsSessionCookie(t *testing.T) {
	srv := newTestServer()
	req := httptest.NewRequest(http.MethodPost, "/login", nil)
	req.Header.Set("Authorization", "Bearer token-alvaro")
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("got %d, want 200", rec.Code)
	}
	cookie := sessionCookie(rec.Result().Cookies())
	if cookie == nil || cookie.Value == "" {
		t.Fatal("missing session cookie")
	}
	if !cookie.HttpOnly {
		t.Fatal("session cookie must be HttpOnly")
	}
}

func TestProtectedRouteWithoutSessionReturns401(t *testing.T) {
	srv := newTestServer()
	req := httptest.NewRequest(http.MethodGet, "/data.json", nil)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("got %d, want 401", rec.Code)
	}
}

func TestProtectedRouteWithSessionReturns200(t *testing.T) {
	srv := newTestServer()
	login := httptest.NewRequest(http.MethodPost, "/login", nil)
	login.Header.Set("Authorization", "Bearer token-luz")
	loginRec := httptest.NewRecorder()
	srv.ServeHTTP(loginRec, login)
	if loginRec.Code != http.StatusOK {
		t.Fatalf("login got %d, want 200", loginRec.Code)
	}
	cookie := sessionCookie(loginRec.Result().Cookies())
	if cookie == nil {
		t.Fatal("missing session cookie")
	}
	req := httptest.NewRequest(http.MethodGet, "/data.json", nil)
	req.AddCookie(cookie)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("got %d, want 200", rec.Code)
	}
}

func TestLoginJSONBodyAllowlistedEmail(t *testing.T) {
	srv := newTestServer()
	body := strings.NewReader(`{"idToken":"token-luz"}`)
	req := httptest.NewRequest(http.MethodPost, "/login", body)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("got %d, want 200 body=%s", rec.Code, rec.Body.String())
	}
	if sessionCookie(rec.Result().Cookies()) == nil {
		t.Fatal("missing session cookie")
	}
}
