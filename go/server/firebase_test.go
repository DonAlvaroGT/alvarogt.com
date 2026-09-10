package main

import (
	"context"
	"os"
	"testing"
	"time"
)

func TestFirebaseAdminSDKRejectsGarbageToken(t *testing.T) {
	creds := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS")
	if creds == "" {
		creds = os.Getenv("HOME") + "/.hermes/gabinete/secrets/tablongo-firebase-adminsdk.json"
	}
	if _, err := os.Stat(creds); err != nil {
		t.Skip("sin cuenta de servicio Admin SDK")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	v, err := NewFirebaseVerifier(ctx, creds, "tablongo")
	if err != nil {
		t.Fatalf("init Admin SDK: %v", err)
	}
	if _, err := v.VerifyIDToken(ctx, "not-a-real-token"); err == nil {
		t.Fatal("garbage token must fail verification")
	}
}
