# /go/ — flujo 2

Skinner investiga y publica `data.json`; Frink solo presenta ese fichero. La página no llama a Open-Meteo ni calcula extraescolares y no usa Telegram como API.

## Contrato

`data.json` tiene `schema_version: 1`, `generated_at`, `timezone: Europe/Madrid`, `source` y exactamente dos elementos en `days`: hoy y mañana. Cada día contiene `date`, `min`, `max`, `rain_probability`, `clothes`, `events` y `empty_label`. Los eventos son únicamente entradas reales del calendario cuyo título o lugar menciona Nacho, Luz, Molletito o Mollete; se excluye el calendario `Trabajo`. Sin eventos, `empty_label` es exactamente `No hay extraescolares apuntadas`.

## Generar

```sh
python3 go/skinner_go.py --output go/data.json
```

El script lee `~/.hermes/scripts/cal_read` y Open-Meteo. Si el tiempo no responde, publica el calendario con previsión no disponible. No hay credenciales.

## Probar

```sh
python3 -m unittest go/test_go_flow.py
```

La agenda deportiva sigue separada en `index.html` y no forma parte del contrato de `data.json`.

## Login (cliente, como Viajes y el Tablón)

GO usa el proyecto Firebase `tablongo`. Google Sign-In en el navegador, sin servidor y sin Blaze. Allowlist exacta: `agarciatimon@gmail.com` y `luzolivas@gmail.com`. Cualquier otra cuenta hace `signOut` y muestra «Cuenta no autorizada».

La puerta `#gate` sale al abrir. La agenda (`data.json`) y la agenda deportiva (`sports.json`) solo se piden tras un login de la allowlist. Si esos JSON fallan después de entrar, hay mensaje de error; la página no se queda en blanco.

Config: `go/firebase.public.json` (`projectId` tablongo). La `apiKey` va redactada en git; no subas secretos. Si esa clave no sirve, el navegador toma la config pública de `/tablon/firebase.public.json` (el mismo proyecto, ya en Pages).

`go/server/` queda en el repo por si hace falta otro día; Pages no lo ejecuta y el login de producción no lo usa.

No hay cron ni plan de pago en este paso.
