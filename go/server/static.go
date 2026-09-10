package main

import (
	"net/http"
	"path"
	"path/filepath"
	"strings"
)

func (s *Server) serveSite(prefix, folder string, store JSONStore, jsonNames map[string]string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		rel := strings.TrimPrefix(path.Clean("/"+strings.TrimPrefix(r.URL.Path, strings.TrimSuffix(prefix, "/"))), "/")
		if rel == "." || rel == "" {
			rel = "index.html"
		}
		requestPath := strings.TrimSuffix(prefix, "/") + "/" + rel
		if storeName, ok := jsonNames[requestPath]; ok {
			raw, err := store.Get(r.Context(), storeName)
			if err != nil {
				writeError(w, http.StatusNotFound, "no hay datos")
				return
			}
			w.Header().Set("Content-Type", "application/json; charset=utf-8")
			w.Header().Set("Cache-Control", "no-store")
			_, _ = w.Write(raw)
			return
		}
		allowed := map[string]bool{"index.html": true, "condiciones.json": true}
		if prefix == "/viajes/" {
			allowed = map[string]bool{"index.html": true}
		}
		if !allowed[rel] {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("X-Robots-Tag", "noindex, nofollow")
		http.ServeFile(w, r, filepath.Join(folder, rel))
	})
}
