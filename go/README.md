# /go/ — flujo 2

Skinner investiga y publica `data.json`; Frink solo presenta ese fichero. La página no llama a Open-Meteo ni calcula extraescolares y no usa Telegram como API.

## Contrato

`data.json` tiene `schema_version: 1`, `generated_at`, `timezone: Europe/Madrid`, `source` y exactamente dos elementos en `days`: hoy y mañana. Cada día contiene `date`, `min`, `max`, `rain_probability`, `clothes`, `events` y `empty_label`. Los eventos son únicamente entradas reales del calendario cuyo título o lugar menciona Nacho, Luz, Molletito o Mollete; se excluye el calendario `Trabajo`. Sin eventos, `empty_label` es exactamente `No hay extraescolares apuntadas`.

## Generar y subir (sin git)

```sh
python3 go/skinner_go.py --output go/data.json
/Users/Alvaro/.hermes/hermes-agent/venv/bin/python go/casa_put_json.py --name go/data.json --file go/data.json
/Users/Alvaro/.hermes/hermes-agent/venv/bin/python go/casa_put_json.py --name go/sports.json --file go/sports.json
/Users/Alvaro/.hermes/hermes-agent/venv/bin/python go/casa_put_json.py --name viajes/viajes.json --file viajes/viajes.json
```

Los JSON viven en Firestore `casa_json` (solo Admin SDK). El servicio Cloud Run los sirve tras sesión. No van a git ni a GitHub Pages.

## Login (servidor)

Proyecto Firebase `tablongo`. Google Sign-In en `/login`, cookie HttpOnly `go_session`. Allowlist exacta: `agarciatimon@gmail.com` y `luzolivas@gmail.com`. Otras cuentas 403; sin token 401. `data.json`, `sports.json` y `viajes.json` no se sirven sin sesión.

Secretos solo en `~/.hermes/gabinete/secrets/` (`go.env`, `tablongo-firebase-adminsdk.json`). Nunca a git.

## Probar

```sh
python3 -m unittest go/test_go_flow.py
cd go/server && go test -count=1 -v
```
