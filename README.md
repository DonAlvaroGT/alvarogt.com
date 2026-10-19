# alvarogt.com

Web de casa (familia familia). La sirve **GitHub Pages**: [https://alvarogt.com](https://alvarogt.com).

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
| `/deporte/` | Fuera de uso |

Los datos vivos (menú, reglas, viajes, plantas, festivos) están en **Firestore**, no en este repo. El HTML/JS sí.

## Qué no va aquí

Nada de claves, tokens, correos reales ni reglas de Firebase desplegadas. `tablon/firestore.rules` es **plantilla**.

## Local

Abrir los HTML de cada carpeta; el login y los JSON necesitan el proyecto Firebase de casa.
