# Tablón familiar

Estado: backend pendiente. Esta fase deja preparado Firebase, pero no existe todavía proyecto Firebase ni configuración real; no se afirma que haya sincronización o autenticación funcionando.

La aplicación publicada sin configuración válida muestra «Backend pendiente» y no ofrece un login falso. En `file:`, `localhost` o `127.0.0.1` permite un modo local claramente separado y no seguro: guarda datos en `localStorage`, y el rol escrito en el prompt no verifica identidad.

## Decisiones implementadas

- Firebase como proveedor previsto: Authentication con Google y Firestore.
- Allowlist adulta: `agarciatimon@gmail.com` y `luzolivas@gmail.com`. Es configuración, no un secreto.
- Cuenta infantil compartida: rol `child`, sin login propio; solo puede leer tareas infantiles/compartidas y marcar hechas.
- Una marca infantil queda `child_done` y requiere validación adulta. Un adulto puede validar, marcar directamente o deshacer.
- Puntos acumulativos: una concesión por instancia y beneficiario, con operación idempotente; no hay reinicio.
- Cuatro tareas iniciales provisionales, todas rotuladas `EJEMPLO`, para individual, compartida, diaria y semanal. Se sustituyen o cargan después.

## Archivos Firebase

- `firebase.example.json`: plantilla explícita sin secretos. Sustituir `PENDIENTE_*` solo con la configuración pública del proyecto.
- `firebase.rules.example`: reglas orientativas para tareas, instancias, acciones y concesiones de puntos. Revisarlas en el emulador antes de publicar.
- `domain.mjs`: roles, permisos, ejemplos y transiciones idempotentes probables, compartidos por la demo y los tests.

No guardar service accounts, claves privadas, contraseñas ni tokens en el repositorio. La configuración pública de Firebase no sustituye las reglas de Firestore.

## Modelo Firestore propuesto

`users/{uid}`: `role` (`adult` o `child`), email verificado/allowlist y metadatos mínimos. La cuenta infantil compartida no tiene identidad infantil propia: el mecanismo de acceso supervisado debe quedar definido antes de producción.

`tasks/{taskId}`: `title`, `assignee` (`Nacho`, `Luz`, `shared`), `frequency` (`daily`/`weekly`), `days`, `points`, `requiresValidation`, `status`, `example`, `createdAt`, `updatedAt`.

`taskInstances/{instanceId}`: `taskId`, `period`, `status` (`pending`, `child_done`, `validated`, `adult_done`), `pointsAwarded`, timestamps. Crear una instancia por periodo sin borrar historial.

`actions/{actionId}`: `taskId`, `instanceId`, `action`, `actorUid`, `actorRole`, `createdAt`, `idempotencyKey`. Colección append-only.

`pointAwards/{instanceId_beneficiary}`: clave determinista, `instanceId`, `beneficiary`, `points`, `createdAt`. Su unicidad impide sumar dos veces; una transacción debe comprobar la concesión antes de crearla. Los puntos del adulto no se aceptan del cliente.

## Reglas de autorización

Adultos: solo los dos correos de la allowlist, autenticados con Google y con email verificado; pueden crear/editar tareas, marcar, validar, deshacer y gestionar la concesión de puntos.

Infantil compartida: leer tareas asignadas a Nacho, Luz o `shared`, y crear únicamente la acción `child_done`/cambio equivalente de marcado. Nunca crear o editar tareas, cambiar puntos, validar, deshacer o cambiar visibilidad.

La autorización real debe estar en Firebase Rules y, para operaciones que necesiten transacción, en Cloud Functions/servidor confiable. El frontend no es una frontera de seguridad.

## Cómo configurarlo cuando Álvaro tenga el proyecto

1. Crear un proyecto en Firebase Console, activar Authentication y el proveedor Google.
2. Añadir como usuarios autorizados/verificados a `agarciatimon@gmail.com` y `luzolivas@gmail.com`. No crearles contraseñas: entran con Google.
3. Crear Firestore en modo producción. Aplicar y probar `firebase.rules.example` con Firebase Emulator Suite; ajustar el mecanismo de cuenta infantil compartida antes de publicar. No se debe inventar un login infantil ni elevar sus claims desde el navegador.
4. Registrar la aplicación web y copiar solo la configuración pública en una copia de `firebase.example.json` fuera del control de versiones o en la variable de build documentada. Mantener `status` como `backend pendiente` hasta completar la integración real.
5. Definir el origen publicado exacto, dominios autorizados de Firebase y reglas de CORS si se añade API/Functions.
6. Publicar las reglas desde un entorno autenticado, hacer pruebas con ambos adultos y con la identidad infantil compartida, y verificar: lectura limitada, `child_done`, validación, deshacer, marcado adulto, reintentos y no duplicación de puntos.

No ejecutar esos pasos desde este repo: requieren cuenta, proyecto y/o credenciales de Álvaro.

## Pruebas

Sin red ni credenciales:

```sh
node test-app.mjs
node domain.test.mjs
```

Cubren configuración, allowlist, permisos por rol, ejemplos, validación, deshacer y puntos una sola vez.

## Límites actuales

No hay proyecto Firebase, `firebaseConfig` real, login Google, reglas publicadas, sincronización remota ni backend funcionando. El modo local no es seguro y solo sirve para probar la interfaz.
