#!/usr/bin/env python3
"""Semilla Admin SDK de plantas_casa/tronco-brasil. No va al cliente."""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2 import service_account

SA = Path.home() / ".hermes/gabinete/secrets/tablongo-firebase-adminsdk.json"
PROJECT = "tablongo"
DOC_ID = "tronco-brasil"
SCOPES = ("https://www.googleapis.com/auth/datastore", "https://www.googleapis.com/auth/cloud-platform")

FIELDS = {
    "id": {"stringValue": DOC_ID},
    "nombre": {"stringValue": "Tronco del Brasil"},
    "latin": {"stringValue": "Dracaena fragrans"},
    "zona": {"stringValue": "salon"},
    "foto": {"stringValue": ""},
    "toxica": {"booleanValue": True},
    "nota_toxica": {
        "stringValue": "Tóxica para animales (ASPCA). Que los niños no la mordisqueen."
    },
    "riego_verano_dias": {"integerValue": "10"},
    "riego_invierno_dias": {"integerValue": "20"},
    "consejo": {
        "stringValue": (
            "Riega cuando los 3–4 cm de arriba estén secos. No eches agua en el cogollo. "
            "Vacía el plato a los 15 min. Luz media, sin sol directo."
        )
    },
    "ultimo_riego": {"nullValue": None},
    "historial": {"arrayValue": {"values": []}},
}


def main() -> None:
    if not SA.is_file():
        raise SystemExit("falta la cuenta de servicio de tablongo (no git)")
    creds = service_account.Credentials.from_service_account_file(str(SA), scopes=SCOPES)
    creds.refresh(Request())
    headers = {"Authorization": "Bearer " + creds.token, "Content-Type": "application/json"}
    base = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents/plantas_casa"
    get_url = f"{base}/{DOC_ID}"
    req = urllib.request.Request(get_url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            if res.status == 200:
                print(f"ok ya existe plantas_casa/{DOC_ID}")
                return
    except urllib.error.HTTPError as err:
        if err.code != 404:
            raise SystemExit(f"firestore GET HTTP {err.code}: {err.read()[:400]!r}") from err
    payload = json.dumps({"fields": FIELDS}).encode("utf-8")
    create = urllib.request.Request(
        f"{base}?documentId={DOC_ID}",
        data=payload,
        method="POST",
        headers=headers,
    )
    try:
        with urllib.request.urlopen(create, timeout=30) as res:
            if res.status not in (200, 201):
                raise SystemExit(f"firestore HTTP {res.status}")
    except urllib.error.HTTPError as err:
        raise SystemExit(f"firestore HTTP {err.code}: {err.read()[:500]!r}") from err
    print(f"ok plantas_casa/{DOC_ID}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
