#!/usr/bin/env python3
"""Semilla Admin SDK: tareas y abono_dias en plantas_casa. Merge, no pisa riego/foto/ultimo_riego/historial."""
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

# Interior/terraza, temporada marzo–sep. Solo este campo; no pisa riego/foto.
ABONO_DIAS = {
    "enebro-gold-coast": 30,
    "romero": 30,
    "lavanda": 30,
    "flor-de-pascua": 20,
    "cocotero": 30,
    "tronco-brasil": 30,
}

KEEP = ("riego_verano_dias", "riego_invierno_dias", "foto", "ultimo_riego", "historial")


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


def snapshot_keep(doc: dict) -> dict:
    fields = doc.get("fields") or {}
    return {k: fields.get(k) for k in KEEP}


def abono_actual(doc: dict) -> int | None:
    raw = ((doc.get("fields") or {}).get("abono_dias") or {}).get("integerValue")
    if raw is None:
        return None
    try:
        n = int(raw)
    except (TypeError, ValueError):
        return None
    return n if n >= 1 else None


def patch_abono(headers: dict[str, str], doc_id: str, dias: int) -> None:
    url = (
        f"https://firestore.googleapis.com/v1/projects/{PROJECT}"
        f"/databases/(default)/documents/plantas_casa/{doc_id}"
        "?updateMask.fieldPaths=abono_dias"
    )
    payload = json.dumps({"fields": {"abono_dias": {"integerValue": str(dias)}}}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, method="PATCH", headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            if res.status not in (200, 201):
                raise SystemExit(f"firestore PATCH abono {doc_id} HTTP {res.status}")
    except urllib.error.HTTPError as err:
        raise SystemExit(f"firestore PATCH abono {doc_id} HTTP {err.code}: {err.read()[:500]!r}") from err


def seed_tareas(headers: dict[str, str]) -> None:
    for doc_id, items in TAREAS.items():
        doc = get_doc(headers, doc_id)
        if doc is None:
            print(f"falta plantas_casa/{doc_id}")
            continue
        if ya_tiene_tareas(doc):
            print(f"ok ya tenía tareas plantas_casa/{doc_id}")
            continue
        before = snapshot_keep(doc)
        patch_tareas(headers, doc_id, items)
        check = get_doc(headers, doc_id)
        if check is None or not ya_tiene_tareas(check):
            raise SystemExit(f"no quedó tareas en plantas_casa/{doc_id}")
        if snapshot_keep(check) != before:
            raise SystemExit(f"tareas pisó riego/foto en plantas_casa/{doc_id}")
        print(f"ok tareas plantas_casa/{doc_id}")


def seed_abono(headers: dict[str, str]) -> None:
    for doc_id, dias in ABONO_DIAS.items():
        doc = get_doc(headers, doc_id)
        if doc is None:
            print(f"falta plantas_casa/{doc_id}")
            continue
        if abono_actual(doc) == dias:
            print(f"ok ya tenía abono_dias={dias} plantas_casa/{doc_id}")
            continue
        before = snapshot_keep(doc)
        patch_abono(headers, doc_id, dias)
        check = get_doc(headers, doc_id)
        if check is None or abono_actual(check) != dias:
            raise SystemExit(f"no quedó abono_dias en plantas_casa/{doc_id}")
        if snapshot_keep(check) != before:
            raise SystemExit(f"abono pisó riego/foto/ultimo_riego/historial en plantas_casa/{doc_id}")
        print(f"ok abono_dias={dias} plantas_casa/{doc_id}")


def main() -> None:
    headers = auth_headers()
    seed_tareas(headers)
    seed_abono(headers)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
