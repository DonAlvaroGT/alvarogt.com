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
	app, err := firebase.NewApp(ctx, &firebase.Config{ProjectID: projectID}, option.WithCredentialsFile(credentialsFile))
	if err != nil {
		return nil, fmt.Errorf("firebase app: %w", err)
	}
	client, err := app.Auth(ctx)
	if err != nil {
		return nil, fmt.Errorf("firebase auth: %w", err)
	}
	return firebaseVerifier{client: client}, nil
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
