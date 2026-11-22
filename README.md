# alvarogt.com

Web de casa (familia). La sirve **GitHub Pages**: [https://alvarogt.com](https://alvarogt.com).

Pie: «Creado por Álvaro GT y sus minions».

## Rutas

| Ruta | Qué es |
| --- | --- |
| `/casa/` | App de casa (barra: Go, Tablón, Viajes, Plantas) |
| `/go/` | Agenda de los niños |
| `/tablon/` | Tablón de tareas (tras login) |
| `/viajes/` | Viajes |
| `/plantas/` | Riego de las plantas |
| `/mapa/` | Mapa de viajes |

Los datos vivos (menú, reglas, viajes, plantas, festivos) están en **Firestore**, no en este repo. El HTML/JS sí.

## Qué no va aquí

Nada de claves, tokens, correos reales ni reglas de Firebase desplegadas. `tablon/firestore.rules` es **plantilla**.

## Local

Abrir los HTML de cada carpeta; el login y los JSON necesitan el proyecto Firebase de casa.

## Tests

CI (GitHub Actions, `.github/workflows/test.yml`) corre Node y Python:

```sh
npm test
python3 -m unittest -v test_pie.py casa/test_casa.py mapa/test_mapa.py plantas/test_plantas.py
python3 -m unittest discover -v -s go -p 'test_*.py'
python3 -m unittest discover -v -s viajes -p 'test_*.py'
```

El verde de CI no cubre los JSON vivos ni Firestore. Esos tests se saltan si falta el archivo o la cuenta de servicio (`OK (skipped=N)`). Con `-v` se ve el motivo.

Solo en local (no van a git; en Actions no hay secretos):

- `go/reglas.json` y `go/comedor.json` — schema contra el JSON de disco
- Firestore `go_reglas` y `go_comedor` — hace falta `~/.hermes/gabinete/secrets/tablongo-firebase-adminsdk.json`
- `viajes/viajes.json` y `viajes/viajes_casa.json` — contenido de los JSON de disco
