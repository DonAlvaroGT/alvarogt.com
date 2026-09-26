# Viajes · alvarogt.com/viajes

Frink actualiza `viajes.json` en disco y lo sube con `go/casa_put_json.py --name viajes/viajes.json`. El HTML calcula relojes, cuenta atrás, tiempo, mapa y enlaces. El JSON no va a git: vive en Firestore `casa_json/viajes`.

Login en la propia página (mismas dos cuentas que GO). La puerta dice «Casa · Viajes». Esta página no abre el tablón.

Sin movilidad, sin localizadores, sin precios, sin «sin nombre en el PDF». Si falta el hotel, se omite. Horas locales.

Vista de mes (detrás del login, entre Hoy/Mañana y el resumen): este mes y el siguiente en Europe/Madrid, semana de lunes, 6 filas. Se pinta siempre al cargar, también en vista Hoy de Casa (solo se ocultan los relojes). El día se colorea si cae entre `inicio` y `fin` (no usa `dias[]`). Color por `quien`. Si coinciden dos viajes, dos puntos.

Hoy/mañana: OpenStreetMap del sitio del día. Vuelos en tarjeta (código, horas locales con huso, cuenta atrás, hito de aeropuerto si hay `antelacion_min`). Enlaces a Flightradar24 y FlightAware; sin tracking en vivo. `antelacion_min` es valor de casa, no de Aena. Si falta llegada o huso, la tarjeta dice «Confirmar en la app». No inventar horas, puertas ni terminales.

Campos opcionales del vuelo (schema_version 1; `ruta` se conserva): origen, destino, salida, llegada, offset_llegada, tz_origen, tz_destino, aerolinea, terminal_salida, terminal_llegada, puerta, quien, antelacion_min.

Resumen: ciudades cortas (`ciudades`). Disney enlaza a `/disney/` en alvarogt.com; no tocar esa carpeta.

Ir a día debajo del login: mueve Hoy y Mañana. Botón Hoy vuelve al día real. `?fecha=YYYY-MM-DD` también vale. Tocar un día del mes con viaje abre la vista Hoy de esa fecha (como `?fecha=`); un día sin viaje no cambia la fecha.
