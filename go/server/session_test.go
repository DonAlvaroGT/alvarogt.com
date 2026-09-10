package main

import (
	"strings"
	"testing"
	"time"
)

func TestParseSessionRejectsTamperedToken(t *testing.T) {
	secret := []byte("secret-a")
	token, err := signSession(secret, "agarciatimon@gmail.com", time.Now(), time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	tampered := token[:len(token)-2] + "aa"
	if _, err := parseSession(secret, tampered, time.Now()); err == nil {
		t.Fatal("tampered token must fail")
	}
}

func TestParseSessionRejectsExpiredToken(t *testing.T) {
	secret := []byte("secret-a")
	now := time.Unix(1_700_000_000, 0)
	token, err := signSession(secret, "luzolivas@gmail.com", now, time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := parseSession(secret, token, now.Add(2*time.Minute)); err == nil {
		t.Fatal("expired token must fail")
	}
}

func TestParseSessionAcceptsValidToken(t *testing.T) {
	secret := []byte("secret-a")
	now := time.Now()
	token, err := signSession(secret, "luzolivas@gmail.com", now, time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	email, err := parseSession(secret, token, now)
	if err != nil {
		t.Fatal(err)
	}
	if email != "luzolivas@gmail.com" {
		t.Fatalf("got %q", email)
	}
	if !strings.HasPrefix(token, "eyJ") {
		t.Fatalf("expected JWT, got %q", token)
	}
}
