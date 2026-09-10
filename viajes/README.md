# Viajes · alvarogt.com/viajes

Frink actualiza `viajes.json` en disco y lo sube con `go/casa_put_json.py --name viajes/viajes.json`. El HTML calcula relojes, cuenta atrás, tiempo, mapa y enlaces. El JSON no va a git.

Login de servidor (mismas dos cuentas que GO). Esta página no abre el tablón. En local (localhost) se puede ver sin login si el JSON está al lado.

Sin movilidad, sin localizadores, sin precios, sin «sin nombre en el PDF». Si falta el hotel, se omite. Horas locales.

Hoy/mañana: OpenStreetMap del sitio del día y enlace a Flightradar24 si hay vuelo (sin tracking en vivo).

Resumen: ciudades cortas (`ciudades`). Disney enlaza a `/disney/` en alvarogt.com; no tocar esa carpeta.

Ir a día debajo del login: mueve Hoy y Mañana. Botón Hoy vuelve al día real. `?fecha=YYYY-MM-DD` también vale.
