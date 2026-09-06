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

La agenda deportiva sigue separada en `index.html` y no forma parte de este contrato.
