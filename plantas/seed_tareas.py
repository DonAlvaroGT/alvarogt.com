#!/usr/bin/env python3
"""Semilla Admin SDK: tareas de temporada en plantas_casa. Merge, no pisa riego/foto."""
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
SCOPES = ("https://www.googleapis.com/auth/datastore", "https://www.googleapis.com/auth/cloud-platform")

TAREAS = {
    "enebro-gold-coast": [
        {"texto": "Trasplantar a maceta mayor", "mes_desde": 3, "mes_hasta": 4},
    ],
    "romero": [
        {"texto": "Trasplantar a maceta mayor", "mes_desde": 3, "mes_hasta": 4},
    ],
    "lavanda": [
        {"texto": "Trasplantar a maceta mayor", "mes_desde": 3, "mes_hasta": 4},
        {"texto": "Podar tras la floración, sin cortar la parte leñosa", "mes_desde": 8, "mes_hasta": 9},
    ],
    "flor-de-pascua": [
        {"texto": "Podar", "mes_desde": 4, "mes_hasta": 5},
        {"texto": "Empezar 14 h diarias de oscuridad durante 8 semanas", "mes_desde": 10, "mes_hasta": 10},
    ],
}


def auth_headers() -> dict[str, str]:
    if not SA.is_file():
        raise SystemExit("falta la cuenta de servicio de tablongo (no git)")
    creds = service_account.Credentials.from_service_account_file(str(SA), scopes=SCOPES)
    creds.refresh(Request())
    return {"Authorization": "Bearer " + creds.token, "Content-Type": "application/json"}


def tarea_maps(items: list[dict]) -> dict:
    values = []
    for t in items:
        values.append(
            {
                "mapValue": {
                    "fields": {
                        "texto": {"stringValue": t["texto"]},
                        "mes_desde": {"integerValue": str(t["mes_desde"])},
                        "mes_hasta": {"integerValue": str(t["mes_hasta"])},
                    }
                }
            }
        )
    return {"arrayValue": {"values": values}}


def get_doc(headers: dict[str, str], doc_id: str) -> dict | None:
    url = (
        f"https://firestore.googleapis.com/v1/projects/{PROJECT}"
        f"/databases/(default)/documents/plantas_casa/{doc_id}"
    )
    req = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            return json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        if err.code == 404:
            return None
        raise SystemExit(f"firestore GET {doc_id} HTTP {err.code}: {err.read()[:400]!r}") from err


def patch_tareas(headers: dict[str, str], doc_id: str, items: list[dict]) -> None:
    url = (
        f"https://firestore.googleapis.com/v1/projects/{PROJECT}"
        f"/databases/(default)/documents/plantas_casa/{doc_id}"
        "?updateMask.fieldPaths=tareas"
    )
    payload = json.dumps({"fields": {"tareas": tarea_maps(items)}}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, method="PATCH", headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            if res.status not in (200, 201):
                raise SystemExit(f"firestore PATCH {doc_id} HTTP {res.status}")
    except urllib.error.HTTPError as err:
        raise SystemExit(f"firestore PATCH {doc_id} HTTP {err.code}: {err.read()[:500]!r}") from err


def ya_tiene_tareas(doc: dict) -> bool:
    fields = doc.get("fields") or {}
    arr = ((fields.get("tareas") or {}).get("arrayValue") or {}).get("values") or []
    return len(arr) > 0


def main() -> None:
    headers = auth_headers()
    for doc_id, items in TAREAS.items():
        doc = get_doc(headers, doc_id)
        if doc is None:
            print(f"falta plantas_casa/{doc_id}")
            continue
        if ya_tiene_tareas(doc):
            print(f"ok ya tenía tareas plantas_casa/{doc_id}")
            continue
        patch_tareas(headers, doc_id, items)
        check = get_doc(headers, doc_id)
        if check is None or not ya_tiene_tareas(check):
            raise SystemExit(f"no quedó tareas en plantas_casa/{doc_id}")
        print(f"ok tareas plantas_casa/{doc_id}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
