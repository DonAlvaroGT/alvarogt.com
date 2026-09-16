# /go/ — agenda de casa

La página pinta Hoy y Mañana al abrir: tiempo (Open-Meteo), ropa de Nacho, extraescolares fijos (`casa_json/go_reglas`), comedor y viaje. Interruptor **Hoy | Semana** dentro de Go (no es otra pestaña): Semana son lun–dom de la semana en curso (Europe/Madrid). Recuerda la vista en `localStorage` (`go.vista`). `go_data` es opcional (EventKit). El deporte sigue en `go_sports` y solo en la vista Hoy.

## Contrato

`go_reglas` tiene `schema_version: 1`, `timezone: Europe/Madrid` y `extraescolares` fijos. Fútbol Nacho lun+mié 16:30 desde 2026-09-21; Inglés con Dom jue 16:30 desde 2026-09-24; natación Mollete mié 18:30–19:00. Si `go_data` trae el mismo título, se queda el de EventKit (sin duplicar ni cambiar la hora).

Ropa de Nacho en cliente: chándal martes y miércoles; uniforme lunes, jueves y viernes; fin de semana sin esa línea.

El sello `#updated` usa `go_data.generated_at` si es un timestamp ISO (hora Madrid). Si solo hay fecha de calendario (`YYYY-MM-DD`), pinta «Datos del …» sin hora. Nunca `new Date('2026-09-15')`.

`go_comedor` sigue aparte (JSON de mes; la página elige el día). No va en `go_data`.

## Subir JSON (sin git)

```sh
/Users/Alvaro/.hermes/hermes-agent/venv/bin/python go/casa_put_json.py --name go/reglas.json --file go/reglas.json
/Users/Alvaro/.hermes/hermes-agent/venv/bin/python go/casa_put_json.py --name go/data.json --file go/data.json
/Users/Alvaro/.hermes/hermes-agent/venv/bin/python go/casa_put_json.py --name go/sports.json --file go/sports.json
/Users/Alvaro/.hermes/hermes-agent/venv/bin/python go/casa_put_json.py --name go/comedor.json --file go/comedor.json
/Users/Alvaro/.hermes/hermes-agent/venv/bin/python go/casa_put_json.py --name viajes/viajes.json --file viajes/viajes.json
```

Los JSON viven en Firestore `casa_json`. No van a git ni a GitHub Pages. La página en `alvarogt.com/go/` los lee tras el login.

## Login (cliente)

Proyecto Firebase `tablongo`. Google Sign-In en la propia página. Allowlist exacta: `agarciatimon@gmail.com` y `luzolivas@gmail.com`. Otras cuentas: `signOut` y «Cuenta no autorizada». Firestore deniega la lectura sin esas cuentas.

Secretos solo en `~/.hermes/gabinete/secrets/` (`tablongo-firebase-adminsdk.json`). Nunca a git.

## Probar

```sh
python3 -m unittest go/test_go_flow.py go/test_go_reglas.py
node --check go/fechas.mjs go/stamp.mjs go/ropa.mjs go/tiempo.mjs go/reglas.mjs go/comedor.mjs go/trip_line.mjs go/vista.mjs
node go/test_stamp.mjs
node go/test_ropa.mjs
node go/test_reglas.mjs
node go/test_tiempo.mjs
node go/test_comedor.mjs
node go/test_vista.mjs
node go/test_trip_line.mjs
/Users/Alvaro/.hermes/hermes-agent/venv/bin/python -m unittest go/test_go_comedor.py
```
