#!/usr/bin/env python3
"""Sube un JSON de casa a Firestore (colección casa_json). No usa git."""
from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2 import service_account

DOCS = {
    "go/data.json": "go_data",
    "go/sports.json": "go_sports",
    "go/comedor.json": "go_comedor",
    "go/reglas.json": "go_reglas",
    "viajes/viajes.json": "viajes",
}
SA = Path.home() / ".hermes/gabinete/secrets/tablongo-firebase-adminsdk.json"
PROJECT = "tablongo"
SCOPES = ("https://www.googleapis.com/auth/datastore", "https://www.googleapis.com/auth/cloud-platform")


def _headers(token: str) -> dict:
    return {"Authorization": "Bearer " + token, "Content-Type": "application/json"}


def put(name: str, body: str) -> None:
    doc = DOCS[name]
    creds = service_account.Credentials.from_service_account_file(str(SA), scopes=SCOPES)
    creds.refresh(Request())
    payload = json.dumps({"fields": {"body": {"stringValue": body}}}).encode("utf-8")
    base = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents/casa_json"
    patch_url = f"{base}/{doc}?updateMask.fieldPaths=body"
    req = urllib.request.Request(patch_url, data=payload, method="PATCH", headers=_headers(creds.token))
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            if res.status not in (200, 201):
                raise SystemExit(f"firestore HTTP {res.status}")
            return
    except urllib.error.HTTPError as err:
        if err.code != 404:
            raise SystemExit(f"firestore HTTP {err.code}: {err.read()[:500]!r}") from err
    create = urllib.request.Request(
        f"{base}?documentId={doc}",
        data=payload,
        method="POST",
        headers=_headers(creds.token),
    )
    try:
        with urllib.request.urlopen(create, timeout=30) as res:
            if res.status not in (200, 201):
                raise SystemExit(f"firestore HTTP {res.status}")
    except urllib.error.HTTPError as err:
        raise SystemExit(f"firestore HTTP {err.code}: {err.read()[:500]!r}") from err


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--name", required=True, choices=sorted(DOCS))
    parser.add_argument("--file", type=Path, required=True)
    args = parser.parse_args()
    raw = args.file.read_text(encoding="utf-8")
    json.loads(raw)
    if not SA.is_file():
        raise SystemExit("falta la cuenta de servicio de tablongo (no git)")
    put(args.name, raw)
    print(f"ok {args.name} -> casa_json/{DOCS[args.name]}")


if __name__ == "__main__":
    main()
