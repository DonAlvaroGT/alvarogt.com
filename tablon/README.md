# Tablón familiar

Producto estático de `/tablon/`. No incluye secretos, PIN ni contraseñas.

## Estado real

La interfaz tiene una demo local y un contrato de integración, pero no hay backend, autenticación ni sincronización remota funcionando. No se debe presentar el modo local como seguridad: `localStorage`, el rol escrito en un `prompt` y JavaScript del navegador solo sirven para probar la interfaz en el mismo navegador.

El modo local se habilita únicamente en `file:`, `localhost`, `127.0.0.1` o `[::1]`. En cualquier origen publicado, si no existe una configuración válida, la aplicación muestra «Integración pendiente» y no ofrece un login falso ni lee `localStorage`.

`backendConfigured` no está activado. No cambiarlo a `true` hasta tener proveedor, backend HTTPS, origen exacto, sujetos autorizados, esquema, reglas, migraciones y pruebas de sesión decididos.

## Configuración segura pendiente

`config.mjs` valida una configuración de despliegue opcional (`TABLON_CONFIG`) con solo estas claves: `backendConfigured`, `apiBase` y `authProvider`. `apiBase` debe ser HTTPS y no puede llevar usuario ni contraseña. Nunca pongas secretos en GitHub Pages, `app.js` ni este repositorio. Una clave pública del proveedor no es un secreto, pero debe documentarse como tal.

El adaptador actual solo deja preparado `fetch` con `credentials: include` y mensajes explícitos para 401/403; no implementa login, logout, refresco de sesión, lectura remota ni escrituras remotas completas. Por tanto no hay sincronización falsa.

## Ruta concreta de integración backend

1. Decisión de arquitectura: elegir proveedor de identidad y persistencia. Confirmar si Nacho y Luz tendrán identidad propia o acceso supervisado; no inventar cuentas.
2. Identidad: crear las cuentas de Álvaro y Lucita en el proveedor elegido y guardar sus subject IDs en una allowlist del servidor. El frontend nunca decide el rol. Definir callback/origen, caducidad, logout, recuperación y política de cookies/tokens.
3. Autenticación: backend verifica la sesión en cada petición; usa HTTPS, cookies `Secure`, `HttpOnly`, `SameSite=Lax` (o tokens cortos con rotación si el proveedor lo exige), CORS exacto para el origen publicado y protección CSRF si se usan cookies.
4. Autorización: derivar `actor` y `role` de la sesión. Álvaro y Lucita pueden crear, editar, pausar, archivar, validar, marcar como adulto y deshacer. Un niño solo puede ver sus tareas (y compartidas) y emitir `child_done`. El servidor aplica control de acceso por objeto y no acepta del cliente actor, puntos, saldo, permisos, estado final ni visibilidad.
5. API: implementar `GET /session`, `POST /auth/logout`, `GET /tasks?period=...`, `POST /tasks`, `PATCH /tasks/:id`, `POST /tasks/:id/instances/:instanceId/actions` y `GET /events?taskId=...`. Las acciones mutantes requieren `Idempotency-Key`; reintentar debe devolver el mismo resultado.
6. Esquema: `tasks(id, title, assignee, frequency, days, points, requires_validation, status, created_at, updated_at)`; `task_instances(id, task_id, period, status, points_awarded, created_at, updated_at)`; `events(id, task_id, instance_id, action, actor_subject, created_at)`, append-only. Añadir índices por periodo/asignatario y unicidad de concesión por `(instance_id, beneficiary)`.
7. Reglas de acciones: niño pasa a `child_done`; si requiere validación no suma. Adulto valida o marca `adult_done`; la concesión de puntos y el saldo son transaccionales e idempotentes. Deshacer solo adulto, registra evento y no borra historial. El rollover diario/semanal crea una instancia nueva sin borrar eventos ni saldo.
8. Validación: título 1–120 y sin HTML/script; puntos entero 0–1000; enums estrictos para asignatario, frecuencia, días y estado; IDs y periodos válidos; límites de tamaño y rate limiting. Rechazar campos desconocidos sensibles si el framework lo permite.
9. Migración: crear tablas, constraints, índices, reglas de acceso y auditoría; aplicar en un entorno de prueba; seed vacío. Migrar solo datos locales si Álvaro los revisa explícitamente: son datos de navegador, no una fuente fiable ni identidad.
10. Despliegue: backend HTTPS, secretos en el gestor de secretos del proveedor, CORS exacto, logs sin tokens, monitorización de 401/403/5xx y backups. Configurar `TABLON_CONFIG` durante el build/despliegue, nunca secretos en el repo. Probar ventana limpia, dos sesiones, caducidad, permisos cruzados, reintentos, CSRF, rollover y recuperación antes de activar.

## Firebase frente a Supabase: decisión pendiente

- Firebase: Auth + Firestore/Cloud Functions y reglas declarativas. Suele acelerar identidad y tiempo real; exige decidir reglas Firestore, modelo de costes por lecturas/escrituras y dependencia fuerte del ecosistema Firebase.
- Supabase: Auth + Postgres + RLS y Edge Functions. Da SQL, constraints y transacciones familiares para este esquema; exige diseñar RLS, funciones seguras y revisar costes/operativa del proyecto.

No elijo por Álvaro: cambian coste, modelo de seguridad y arquitectura. Falta decidir proveedor, presupuesto, región, si se necesita tiempo real y quién operará las migraciones.

## Archivos

- `index.html`: estructura y mensajes de acceso.
- `app.js`: demo local separada; adaptador remoto deliberadamente incompleto.
- `config.mjs`: validación sin red ni secretos.
- `backend.example.json`: contrato y pendientes explícitos.
- `test-app.mjs`: pruebas Node sin paquetes ni red.

## Límites

No hay credenciales, cuentas, proveedor elegido, backend desplegado, migración aplicada ni autenticación real. No se debe afirmar que el tablón sincroniza entre dispositivos ni que protege datos mientras siga en este estado.
