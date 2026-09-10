package main

import (
	"context"
	"errors"
	"os"
	"path"
	"path/filepath"
	"strings"
	"sync"

	"cloud.google.com/go/firestore"
)

var errNoJSON = errors.New("json no encontrado")

var jsonDocIDs = map[string]string{
	"go/data.json":       "go_data",
	"go/sports.json":     "go_sports",
	"viajes/viajes.json": "viajes",
}

type JSONStore interface {
	Get(ctx context.Context, name string) ([]byte, error)
}

type diskStore struct {
	root string
}

func (d diskStore) Get(_ context.Context, name string) ([]byte, error) {
	clean := path.Clean("/" + name)
	clean = strings.TrimPrefix(clean, "/")
	if clean == "" || strings.HasPrefix(clean, "..") {
		return nil, errNoJSON
	}
	raw, err := os.ReadFile(filepath.Join(d.root, filepath.FromSlash(clean)))
	if err != nil {
		return nil, errNoJSON
	}
	return raw, nil
}

type firestoreStore struct {
	client *firestore.Client
}

func (f firestoreStore) Get(ctx context.Context, name string) ([]byte, error) {
	id, ok := jsonDocIDs[name]
	if !ok || f.client == nil {
		return nil, errNoJSON
	}
	snap, err := f.client.Collection("casa_json").Doc(id).Get(ctx)
	if err != nil {
		return nil, errNoJSON
	}
	body, _ := snap.Data()["body"].(string)
	if strings.TrimSpace(body) == "" {
		return nil, errNoJSON
	}
	return []byte(body), nil
}

type overlayStore struct {
	remote JSONStore
	disk   JSONStore
}

func (o overlayStore) Get(ctx context.Context, name string) ([]byte, error) {
	if o.remote != nil {
		if raw, err := o.remote.Get(ctx, name); err == nil && len(raw) > 0 {
			return raw, nil
		}
	}
	if o.disk != nil {
		return o.disk.Get(ctx, name)
	}
	return nil, errNoJSON
}

type memoryStore struct {
	mu   sync.RWMutex
	data map[string][]byte
}

func (m *memoryStore) Get(_ context.Context, name string) ([]byte, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	raw, ok := m.data[name]
	if !ok {
		return nil, errNoJSON
	}
	return raw, nil
}

func (m *memoryStore) Put(name string, raw []byte) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.data == nil {
		m.data = map[string][]byte{}
	}
	m.data[name] = raw
}
