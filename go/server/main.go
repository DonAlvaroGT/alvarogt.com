package main

import (
	"context"
	_ "embed"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	firebase "firebase.google.com/go/v4"
	"google.golang.org/api/option"
)

//go:embed web/login.html
var loginHTML []byte

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}

func run() error {
	loadDotEnv(firstExisting(
		os.Getenv("GO_ENV_FILE"),
		filepath.Join(os.Getenv("HOME"), ".hermes/gabinete/secrets/go.env"),
		".env",
	))

	projectID := getenv("FIREBASE_PROJECT_ID", "tablongo")
	creds := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS")
	secret := os.Getenv("GO_SESSION_SECRET")
	if len(secret) < 16 {
		return errEnv("falta GO_SESSION_SECRET (mínimo 16 caracteres)")
	}
	allowed := splitEmails(getenv("GO_ALLOWED_EMAILS", "agarciatimon@gmail.com,luzolivas@gmail.com"))
	listen := getenv("GO_LISTEN", "127.0.0.1:8787")
	if port := os.Getenv("PORT"); port != "" {
		listen = ":" + port
	}
	siteRoot := getenv("GO_SITE_ROOT", defaultSiteRoot())
	secure := getenv("GO_SECURE_COOKIE", "0") == "1" || os.Getenv("K_SERVICE") != "" || os.Getenv("PORT") != ""

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	app, verifier, err := newFirebase(ctx, creds, projectID)
	if err != nil {
		return err
	}

	var remote JSONStore
	if app != nil {
		var fsClient *firestore.Client
		fsClient, err = app.Firestore(ctx)
		if err != nil {
			log.Printf("firestore no disponible, se usará disco: %v", err)
		} else {
			remote = firestoreStore{client: fsClient}
		}
	}

	s := NewServer(verifier, allowed, []byte(secret), secure)
	store := overlayStore{remote: remote, disk: diskStore{root: siteRoot}}
	s.mux.HandleFunc("GET /login", s.handleLoginPage)
	s.mux.HandleFunc("GET /go/login", s.handleLoginPage)
	s.mux.HandleFunc("GET /viajes/login", s.handleLoginPage)
	s.mux.HandleFunc("GET /auth/config", s.handleAuthConfig)
	s.mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok\n"))
	})
	s.mux.Handle("GET /go/", s.RequireAuth(s.serveSite("/go/", filepath.Join(siteRoot, "go"), store, map[string]string{
		"/go/data.json":   "go/data.json",
		"/go/sports.json": "go/sports.json",
	})))
	s.mux.Handle("GET /viajes/", s.RequireAuth(s.serveSite("/viajes/", filepath.Join(siteRoot, "viajes"), store, map[string]string{
		"/viajes/viajes.json": "viajes/viajes.json",
	})))
	s.mux.Handle("GET /{$}", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/go/", http.StatusFound)
	}))

	log.Printf("casa login en http://%s (sitio %s)", listen, siteRoot)
	return http.ListenAndServe(listen, s)
}

func newFirebase(ctx context.Context, credentialsFile, projectID string) (*firebase.App, TokenVerifier, error) {
	var opts []option.ClientOption
	if strings.TrimSpace(credentialsFile) != "" {
		opts = append(opts, option.WithCredentialsFile(credentialsFile))
	}
	app, err := firebase.NewApp(ctx, &firebase.Config{ProjectID: projectID}, opts...)
	if err != nil {
		return nil, nil, err
	}
	client, err := app.Auth(ctx)
	if err != nil {
		return nil, nil, err
	}
	return app, firebaseVerifier{client: client}, nil
}

func defaultSiteRoot() string {
	wd, err := os.Getwd()
	if err != nil {
		return "."
	}
	if fileExists(filepath.Join(wd, "go", "index.html")) && fileExists(filepath.Join(wd, "viajes", "index.html")) {
		return wd
	}
	if fileExists(filepath.Join(wd, "..", "index.html")) && fileExists(filepath.Join(wd, "..", "..", "viajes", "index.html")) {
		return filepath.Clean(filepath.Join(wd, "..", ".."))
	}
	return filepath.Clean(filepath.Join(wd, ".."))
}

func fileExists(p string) bool {
	st, err := os.Stat(p)
	return err == nil && !st.IsDir()
}

type envError string

func (e envError) Error() string { return string(e) }

func errEnv(msg string) error { return envError(msg) }

func (s *Server) handleLoginPage(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Robots-Tag", "noindex, nofollow")
	_, _ = w.Write(loginHTML)
}

func (s *Server) handleAuthConfig(w http.ResponseWriter, r *http.Request) {
	cfg := map[string]string{
		"apiKey":            os.Getenv("FIREBASE_WEB_API_KEY"),
		"authDomain":        getenv("FIREBASE_AUTH_DOMAIN", "tablongo.firebaseapp.com"),
		"projectId":         getenv("FIREBASE_PROJECT_ID", "tablongo"),
		"storageBucket":     os.Getenv("FIREBASE_STORAGE_BUCKET"),
		"messagingSenderId": os.Getenv("FIREBASE_MESSAGING_SENDER_ID"),
		"appId":             os.Getenv("FIREBASE_APP_ID"),
	}
	if cfg["apiKey"] == "" || strings.Contains(cfg["apiKey"], "redacted") {
		writeError(w, http.StatusServiceUnavailable, "falta FIREBASE_WEB_API_KEY")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	_ = json.NewEncoder(w).Encode(cfg)
}

func splitEmails(raw string) []string {
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

func getenv(k, fallback string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return fallback
}

func firstExisting(paths ...string) string {
	for _, p := range paths {
		if p == "" {
			continue
		}
		if st, err := os.Stat(p); err == nil && !st.IsDir() {
			return p
		}
	}
	return ""
}

func loadDotEnv(path string) {
	if path == "" {
		return
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		return
	}
	for _, line := range strings.Split(string(raw), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		k, v, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		k = strings.TrimSpace(k)
		v = strings.TrimSpace(v)
		if os.Getenv(k) == "" {
			_ = os.Setenv(k, v)
		}
	}
}
