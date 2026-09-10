package main

import (
	"context"
	"fmt"
	"strings"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"
)

type firebaseVerifier struct {
	client *auth.Client
}

func NewFirebaseVerifier(ctx context.Context, credentialsFile, projectID string) (TokenVerifier, error) {
	_, verifier, err := newFirebase(ctx, credentialsFile, projectID)
	return verifier, err
}

func (v firebaseVerifier) VerifyIDToken(ctx context.Context, idToken string) (string, error) {
	tok, err := v.client.VerifyIDToken(ctx, idToken)
	if err != nil {
		return "", err
	}
	email, _ := tok.Claims["email"].(string)
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return "", errInvalidToken
	}
	return email, nil
}

// kept for tests that construct apps without going through run().
func firebaseApp(ctx context.Context, credentialsFile, projectID string) (*firebase.App, error) {
	var opts []option.ClientOption
	if strings.TrimSpace(credentialsFile) != "" {
		opts = append(opts, option.WithCredentialsFile(credentialsFile))
	}
	app, err := firebase.NewApp(ctx, &firebase.Config{ProjectID: projectID}, opts...)
	if err != nil {
		return nil, fmt.Errorf("firebase app: %w", err)
	}
	return app, nil
}
