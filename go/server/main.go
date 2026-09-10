package main

import (
	"context"
	_ "embed"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"
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
	if creds == "" {
		return errEnv("falta GOOGLE_APPLICATION_CREDENTIALS")
	}
	secret := os.Getenv("GO_SESSION_SECRET")
	if len(secret) < 16 {
		return errEnv("falta GO_SESSION_SECRET (mínimo 16 caracteres)")
	}
	allowed := splitEmails(getenv("GO_ALLOWED_EMAILS", "agarciatimon@gmail.com,luzolivas@gmail.com"))
	listen := getenv("GO_LISTEN", "127.0.0.1:8787")
	staticDir := getenv("GO_STATIC_DIR", "..")
	secure := getenv("GO_SECURE_COOKIE", "0") == "1"

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	verifier, err := NewFirebaseVerifier(ctx, creds, projectID)
	if err != nil {
		return err
	}

	s := NewServer(verifier, allowed, []byte(secret), secure)
	s.mux.HandleFunc("GET /login", s.handleLoginPage)
	s.mux.HandleFunc("GET /auth/config", s.handleAuthConfig)
	s.mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok\n"))
	})
	s.mux.Handle("/", s.RequireAuth(allowedStatic(http.Dir(staticDir))))

	log.Printf("GO login en http://%s (estático %s)", listen, staticDir)
	return http.ListenAndServe(listen, s)
}

type envError string

func (e envError) Error() string { return string(e) }

func errEnv(msg string) error { return envError(msg) }

func allowedStatic(root http.FileSystem) http.Handler {
	fs := http.FileServer(root)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := path.Clean("/" + r.URL.Path)
		switch p {
		case "/", "/index.html", "/data.json", "/sports.json", "/condiciones.json":
			fs.ServeHTTP(w, r)
		default:
			http.NotFound(w, r)
		}
	})
}

func (s *Server) handleLoginPage(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
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
