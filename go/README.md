# /go/ — agenda de casa

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

Los JSON viven en Firestore `casa_json` (`go_data`, `go_sports`, `viajes`). No van a git ni a GitHub Pages. La página en `alvarogt.com/go/` los lee en el cliente tras el login.

## Login (cliente)

Proyecto Firebase `tablongo`. Google Sign-In en la propia página. Allowlist exacta: `agarciatimon@gmail.com` y `luzolivas@gmail.com`. Otras cuentas: `signOut` y «Cuenta no autorizada». Firestore deniega la lectura sin esas cuentas.

Secretos solo en `~/.hermes/gabinete/secrets/` (`tablongo-firebase-adminsdk.json`). Nunca a git.

## Probar

```sh
python3 -m unittest go/test_go_flow.py
```
