# /go/ — flujo 2

Skinner investiga y publica `data.json`; Frink solo presenta ese fichero. La página no llama a Open-Meteo ni calcula extraescolares y no usa Telegram como API.

## Contrato

`data.json` tiene `schema_version: 1`, `generated_at`, `timezone: Europe/Madrid`, `source` y exactamente dos elementos en `days`: hoy y mañana. Cada día contiene `date`, `min`, `max`, `rain_probability`, `clothes`, `events` y `empty_label`. Los eventos son únicamente entradas reales del calendario cuyo título o lugar menciona Nacho, Luz, Molletito o Mollete; se excluye el calendario `Trabajo`. Sin eventos, `empty_label` es exactamente `No hay extraescolares apuntadas`.

## Generar

```sh
python3 go/skinner_go.py --output go/data.json
```

El script lee `~/.hermes/scripts/cal_read` y Open-Meteo. Si el tiempo no responde, publica el calendario con previsión no disponible. No hay credenciales.

## Probar la página (sin login)

```sh
python3 -m unittest go/test_go_flow.py
```

La agenda deportiva sigue separada en `index.html` y no forma parte de este contrato.

## Login (Firebase + allowlist)

GO usa el proyecto Firebase `tablongo` (el mismo del tablón). Google Sign-In. Allowlist exacta: `agarciatimon@gmail.com` y `luzolivas@gmail.com`. Cualquier otro email de Auth recibe 403. Sin token: 401.

El backend está en `go/server/` (lenguaje Go). Verifica el ID token con Firebase Admin SDK, comprueba la allowlist y deja una cookie HttpOnly `go_session` (JWT HS256 propio). Las rutas de la casa (`/`, `data.json`, `sports.json`) van con middleware; `/login`, `/logout`, `/auth/config` y `/healthz` son públicas.

Credenciales (no git, no Telegram, no kanban):

- Variables: `/Users/Alvaro/.hermes/gabinete/secrets/go.env`
- Admin SDK: `/Users/Alvaro/.hermes/gabinete/secrets/tablongo-firebase-adminsdk.json`
- Plantilla: `go/.env.example`
- Config web pública (apiKey redactada en git): `firebase.public.json`. El servidor sirve la clave real en `/auth/config` leyendo `go.env`.

No publicar ni hacer git push de secretos. No Blaze.

### Tests del login

Hace falta el toolchain Go (en esta máquina quedó en el workspace del encargo). Desde `go/server`:

```sh
go test -count=1 -v
```

Cubre: sin token → 401; token inválido → 401; email fuera de allowlist → 403; `agarciatimon@gmail.com` y `luzolivas@gmail.com` → 200 + cookie; ruta protegida sin sesión → 401; con sesión → 200; JWT de sesión firmado/caducado/alterado; Admin SDK rechaza un token basura.

### Arrancar en local (no publica)

```sh
cd go/server
export GO_ENV_FILE=/Users/Alvaro/.hermes/gabinete/secrets/go.env
export GO_STATIC_DIR=/Users/Alvaro/.hermes/gabinete/alvarogt.com/go
go run .
```

Abre `http://127.0.0.1:8787/login`, entra con Google (solo las dos cuentas de casa) y te manda a `/`.

Comprobación sin navegador:

```sh
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://127.0.0.1:8787/login
# 401

curl -s -o /dev/null -w '%{http_code}\n' -X POST http://127.0.0.1:8787/login -H 'Authorization: Bearer not-a-real-token'
# 401

curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8787/data.json
# 401
```

El 403 de un email real fuera de lista se prueba en `go test` con tokens simulados (el Admin SDK no fabrica un ID token de un intruso). En el navegador, un Google que no sea de la allowlist acaba en 403.

No hay cron ni despliegue en este paso.

GitHub Pages (alvarogt.com/go/) es estático: el binario Go no corre ahí y data.json sigue público en Pages. Activar el login de verdad en producción pide un servidor (Cloud Run / Functions), plan Blaze y tocar el alojamiento de /go/. Eso queda parado hasta un sí de Álvaro; no se paga ni se cambia el DNS.
