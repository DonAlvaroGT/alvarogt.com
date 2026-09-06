# Tablón familiar

Producto estático de `/tablon/`. No incluye secretos, PIN ni contraseñas.

## Estado actual

La interfaz está completa para el flujo de tareas, pero la autenticación y el backend de producción están deliberadamente pendientes. `app.js` tiene `CONFIG.backendConfigured = false`: el modo local guarda datos en `localStorage`, está rotulado como no seguro y solo sirve para desarrollo. No hay tareas reales precargadas.

Para producción no se debe activar esa bandera sin desplegar antes un backend con autenticación real y sustituir el adaptador `api()` por el proveedor elegido.

## Arquitectura C

- GitHub Pages sirve `index.html`, `style.css` y `app.js` de forma pública y estática.
- Un backend separado debe verificar la sesión del proveedor de identidad y exponer `/tasks` y `/events`.
- El frontend nunca recibe secretos; cualquier clave pública debe ser no sensible y estar en configuración de despliegue.
- Adultos autorizados: Álvaro y Lucita. El backend debe autorizar acciones de gestión, validación, pausa, archivo, edición y deshacer solo a esos dos sujetos.
- Nacho y Luz solo pueden consultar sus tareas (incluidas las compartidas) y crear una acción de marcado. El backend debe ignorar cualquier `actor` enviado por el navegador y derivarlo de la sesión.

## Modelo mínimo de backend

`Task`: `id`, `title`, `assignee` (`Nacho`, `Luz`, `shared`), `frequency` (`daily`, `weekly`), `days`, `points`, `requiresValidation`, `status` (`active`, `paused`, `archived`), `createdAt`, `updatedAt`.

`TaskInstance`: `id`, `taskId`, periodo/frecuencia, estado (`pending`, `child_done`, `validated`, `adult_done`), `pointsAwarded`, `createdAt`, `updatedAt`.

`Event`: `id`, `taskId`, instancia, acción, actor derivado de sesión y fecha. Es append-only. Editar una tarea no borra eventos ni instancias.

Reinicio: al comenzar el siguiente periodo se crea una instancia nueva; nunca se borra el historial ni se modifica el saldo acumulado. La concesión de puntos debe ser una operación transaccional e idempotente, única por instancia y beneficiario (`unique(instanceId, child, pointsAwarded)` o equivalente).

## Reglas de autorización y validación

- Validar en backend longitud de título (1–120), puntos entero 0–1000, frecuencia y días permitidos, asignatario y estado.
- Rechazar HTML/script en título; el frontend escapa texto y usa `textContent` donde corresponde, pero la validación del servidor es obligatoria.
- No aceptar actor, puntos, saldo, estado final ni permisos desde el cliente como autoridad.
- Niño: `child_done`; si requiere validación, no suma puntos hasta `validated`. Si no la requiere, el backend puede validar automáticamente, dejando evento.
- Adulto: puede marcar directamente (`adult_done`) o validar una marca infantil. Deshacer solo adulto, revierte el estado de la instancia y registra evento; no elimina historial.
- Todos los comandos deben aceptar un idempotency key y devolver el mismo resultado al reintentarse.
- Aplicar control de acceso por objeto: un niño no puede leer tareas ajenas ni editar una tarea compartida.

## Configuración, migraciones y seed

No hay credenciales ni backend configurado en este repositorio. Crear el proveedor de identidad, la base de datos, migración de las tres entidades y una cuenta de Álvaro/Lucita antes de producción. Seed inicial vacío: no inventar tareas reales.

`CONFIG.backendConfigured` solo debe pasar a `true` junto con `apiBase` de un backend HTTPS, después de probar login, expiración de sesión, permisos, reintentos y rollover. El login actual del modo local no es autenticación.

## Despliegue

1. Desplegar el backend con HTTPS, CORS limitado al origen de GitHub Pages, cookies `Secure`, `HttpOnly`, `SameSite=Lax` o tokens de corta duración.
2. Configurar el proveedor de identidad y las dos cuentas autorizadas.
3. Aplicar migraciones y dejar el seed vacío.
4. Configurar `apiBase` mediante el proceso de build, nunca con secretos en el repositorio.
5. Publicar GitHub Pages y probar desde una ventana limpia.

## Límites conocidos

Este repo no puede fingir autenticación real sin credenciales ni backend proporcionados. El modo local no sincroniza dispositivos, no protege los datos frente a otros usuarios del navegador y no es válido para producción. La vista actual implementa el contrato de datos en cliente; el rollover diario/semanal y la persistencia multiusuario deben vivir en el backend.
