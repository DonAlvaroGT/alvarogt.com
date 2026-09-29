#!/usr/bin/env python3
"""Parte viajes por flag. Sin ids fijos.

privado true o visible casa/privado → viajes_casa.json.
El resto → viajes.json. La paleta de un quien que solo sale en privado
no va al JSON público.
"""
from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def es_privado(viaje: object) -> bool:
    if not isinstance(viaje, dict):
        return False
    if viaje.get("privado") is True:
        return True
    return viaje.get("visible") in ("casa", "privado")


def _slice_quien(quien: object, names: set[str]) -> dict:
    q = quien if isinstance(quien, dict) else {}
    order = [n for n in (q.get("order") or []) if n in names]
    for n in names:
        if n and n not in order:
            order.append(n)
    color_raw = q.get("color")
    dot_raw = q.get("dot")
    color_src: dict = color_raw if isinstance(color_raw, dict) else {}
    dot_src: dict = dot_raw if isinstance(dot_raw, dict) else {}
    return {
        "order": order,
        "color": {k: v for k, v in color_src.items() if k in names},
        "dot": {k: v for k, v in dot_src.items() if k in names},
    }


def _merge_quien(a: object, b: object) -> dict:
    qa = a if isinstance(a, dict) else {}
    qb = b if isinstance(b, dict) else {}
    order: list[str] = []
    for n in list(qa.get("order") or []) + list(qb.get("order") or []):
        if n and n not in order:
            order.append(n)
    color = {}
    color.update(qa.get("color") or {})
    color.update(qb.get("color") or {})
    dot = {}
    dot.update(qa.get("dot") or {})
    dot.update(qb.get("dot") or {})
    return {"order": order, "color": color, "dot": dot}


def combine_docs(pub: dict, casa: dict | None) -> dict:
    """Junta público + casa. Los del doc de casa salen con privado true."""
    combined = deepcopy(pub)
    viajes = list(combined.get("viajes") or [])
    by_id = {v.get("id"): i for i, v in enumerate(viajes) if isinstance(v, dict) and v.get("id")}
    extra = casa or {}
    for v in extra.get("viajes") or []:
        if not isinstance(v, dict) or not v.get("id"):
            continue
        trip = deepcopy(v)
        trip["privado"] = True
        idx = by_id.get(trip["id"])
        if idx is None:
            by_id[trip["id"]] = len(viajes)
            viajes.append(trip)
        else:
            viajes[idx] = trip
    combined["viajes"] = viajes
    combined["quien"] = _merge_quien(pub.get("quien"), extra.get("quien"))
    return combined


def split_doc(doc: dict) -> tuple[dict, dict]:
    src = deepcopy(doc)
    viajes = [v for v in (src.get("viajes") or []) if isinstance(v, dict)]
    pub_trips = [v for v in viajes if not es_privado(v)]
    casa_trips = [v for v in viajes if es_privado(v)]
    pub_names = {str(v["quien"]) for v in pub_trips if v.get("quien")}
    casa_names = {str(v["quien"]) for v in casa_trips if v.get("quien")}
    casa_only = casa_names - pub_names

    pub = deepcopy(src)
    pub["viajes"] = pub_trips
    pub["quien"] = _slice_quien(src.get("quien"), pub_names)

    casa = {
        "schema_version": src.get("schema_version", 1),
        "actualizado": src.get("actualizado"),
        "fuente": src.get("fuente"),
        "zona_casa": src.get("zona_casa"),
        "quien": _slice_quien(src.get("quien"), casa_only),
        "viajes": casa_trips,
    }
    return pub, casa


def load_combined(root: Path | None = None) -> dict:
    base = root or ROOT
    pub = json.loads((base / "viajes.json").read_text(encoding="utf-8"))
    casa_path = base / "viajes_casa.json"
    casa = json.loads(casa_path.read_text(encoding="utf-8")) if casa_path.is_file() else None
    return combine_docs(pub, casa)


def write_split(pub: dict, casa: dict, root: Path | None = None) -> None:
    base = root or ROOT
    (base / "viajes.json").write_text(
        json.dumps(pub, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (base / "viajes_casa.json").write_text(
        json.dumps(casa, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def main() -> None:
    pub, casa = split_doc(load_combined())
    write_split(pub, casa)
    print(f"ok publico {len(pub['viajes'])} casa {len(casa['viajes'])}")


if __name__ == "__main__":
    main()
