package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func newSiteTestServer(t *testing.T) http.Handler {
	t.Helper()
	dir := t.TempDir()
	if err := os.MkdirAll(filepath.Join(dir, "go"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(dir, "viajes"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "go", "index.html"), []byte("<html>go</html>"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "viajes", "index.html"), []byte("<html>viajes</html>"), 0o644); err != nil {
		t.Fatal(err)
	}
	store := &memoryStore{data: map[string][]byte{
		"go/data.json":       []byte(`{"schema_version":1}`),
		"go/sports.json":     []byte(`{"events":[]}`),
		"viajes/viajes.json": []byte(`{"schema_version":1,"viajes":[]}`),
	}}
	s := NewServer(mapVerifier{
		"token-intruso": "intruso@example.com",
		"token-alvaro":  "agarciatimon@gmail.com",
		"token-luz":     "luzolivas@gmail.com",
	}, []string{"agarciatimon@gmail.com", "luzolivas@gmail.com"}, []byte("test-session-secret"), false)
	s.mux.HandleFunc("GET /login", s.handleLoginPage)
	s.mux.Handle("GET /go/", s.RequireAuth(s.serveSite("/go/", filepath.Join(dir, "go"), store, map[string]string{
		"/go/data.json":   "go/data.json",
		"/go/sports.json": "go/sports.json",
	})))
	s.mux.Handle("GET /viajes/", s.RequireAuth(s.serveSite("/viajes/", filepath.Join(dir, "viajes"), store, map[string]string{
		"/viajes/viajes.json": "viajes/viajes.json",
	})))
	return s
}

func loginCookie(t *testing.T, srv http.Handler, token string) *http.Cookie {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/login", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("login got %d body=%s", rec.Code, rec.Body.String())
	}
	c := sessionCookie(rec.Result().Cookies())
	if c == nil {
		t.Fatal("missing session cookie")
	}
	return c
}

func TestProtectedJSONWithoutSessionReturns401(t *testing.T) {
	srv := newSiteTestServer(t)
	for _, p := range []string{"/go/data.json", "/go/sports.json", "/viajes/viajes.json"} {
		rec := httptest.NewRecorder()
		srv.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, p, nil))
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("%s got %d want 401 body=%s", p, rec.Code, rec.Body.String())
		}
	}
}

func TestHTMLWithoutSessionRedirectsToLogin(t *testing.T) {
	srv := newSiteTestServer(t)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/go/", nil))
	if rec.Code != http.StatusFound {
		t.Fatalf("got %d want 302", rec.Code)
	}
	loc := rec.Header().Get("Location")
	if !strings.HasPrefix(loc, "/login?") {
		t.Fatalf("location %q", loc)
	}
}

func TestAllowlistedSessionServesJSON(t *testing.T) {
	srv := newSiteTestServer(t)
	cookie := loginCookie(t, srv, "token-alvaro")
	for _, p := range []string{"/go/data.json", "/go/sports.json", "/viajes/viajes.json"} {
		req := httptest.NewRequest(http.MethodGet, p, nil)
		req.AddCookie(cookie)
		rec := httptest.NewRecorder()
		srv.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("%s got %d body=%s", p, rec.Code, rec.Body.String())
		}
	}
	luz := loginCookie(t, srv, "token-luz")
	req := httptest.NewRequest(http.MethodGet, "/viajes/viajes.json", nil)
	req.AddCookie(luz)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("luz viajes got %d", rec.Code)
	}
}

func TestIntruderStillForbidden(t *testing.T) {
	srv := newSiteTestServer(t)
	req := httptest.NewRequest(http.MethodPost, "/login", nil)
	req.Header.Set("Authorization", "Bearer token-intruso")
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("got %d want 403", rec.Code)
	}
}

func TestNonAllowlistedSessionCookieReturns403(t *testing.T) {
	srv := newSiteTestServer(t)
	token, err := signSession([]byte("test-session-secret"), "intruso@example.com", time.Now(), time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodGet, "/go/data.json", nil)
	req.AddCookie(&http.Cookie{Name: sessionCookieName, Value: token})
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("got %d want 403 body=%s", rec.Code, rec.Body.String())
	}
}

func TestLoginPageIsPublic(t *testing.T) {
	srv := newSiteTestServer(t)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/login", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "Entra con Google") {
		t.Fatal("login html missing")
	}
}
