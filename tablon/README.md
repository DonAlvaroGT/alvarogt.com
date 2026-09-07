# Tablón familiar

Estado: backend pendiente. Esta fase deja preparado Firebase, pero no existe todavía proyecto Firebase ni configuración real; no se afirma que haya sincronización o autenticación funcionando.

La aplicación publicada sin configuración válida muestra «Backend pendiente» y no ofrece un login falso. En `file:`, `localhost` o `127.0.0.1` permite un modo local claramente separado y no seguro: guarda datos en `localStorage`, y el rol escrito en el prompt no verifica identidad.

## Decisiones implementadas

- Firebase como proveedor previsto: Authentication con Google y Firestore.
- Allowlist adulta: `agarciatimon@gmail.com` y `luzolivas@gmail.com`.
- Una identidad infantil compartida sin login propio; su mecanismo de acceso supervisado aún debe configurarse y emitir un claim no manipulable por el navegador.
- Niños: leer tareas visibles y marcarlas. No crean, editan, validan, deshacen ni gestionan puntos.
- Toda marca infantil queda `child_done`, pendiente de validación adulta.
- Adultos pueden crear/editar tareas, marcar, validar y deshacer.
- Puntos acumulativos e idempotentes: una concesión por instancia y beneficiario; deshacer no resta.
- Cuatro tareas iniciales provisionales, todas rotuladas `EJEMPLO`, para individual, compartida, diaria y semanal. Se sustituyen o cargan después.

## Auditoría de seguridad

`firebase.rules.example` es una plantilla para revisar en el emulador, no una prueba de que Firebase esté operativo. Las reglas:

- exigen autenticación, email verificado y allowlist exacta para adultos;
- no permiten que el navegador escriba `pointAwards` ni `balances`;
- limitan al niño a `pending → child_done`, sin editar puntos, actor o campos de control;
- hacen append-only las acciones y no exponen el historial a la identidad infantil;
- bloquean el borrado de tareas, instancias, acciones y premios;
- no aceptan un rol escrito por el cliente: `childRole` debe provenir de un mecanismo confiable.

La configuración local no es seguridad: cualquiera que abra la demo puede escribir `adulto`, modificar `localStorage` o ejecutar JavaScript. La UI solo sirve para probar el flujo; producción debe autorizar en Firebase/backend.

## Backend obligatorio para validar y sumar

Cloud Functions (o un servidor confiable con Admin SDK) debe:

1. Verificar Firebase Auth, email verificado y allowlist adulta en cada llamada; resolver la identidad infantil solo mediante el mecanismo supervisado acordado.
2. Validar que la instancia, tarea, beneficiario y puntos existen y que la transición es válida: niño `pending → child_done`; adulto `child_done → validated`, o `pending → adult_done`; adulto puede deshacer sin borrar historial.
3. Registrar una acción append-only con `actorUid`, rol servidor, timestamp e `idempotencyKey`; rechazar claves reutilizadas con payload distinto y devolver el mismo resultado al reintentar.
4. En una única transacción, comprobar el estado y crear `pointAwards/{instanceId_beneficiary}` con clave determinista. Solo si no existe, sumar el balance. Marcar la instancia como premiada únicamente dentro de esa operación. Nunca aceptar `points`, `actor`, `role` o `balance` del cliente como autoridad.
5. Mantener el historial aunque se deshaga una tarea. Una nueva validación tras un deshacer no debe volver a sumar el mismo premio de la misma instancia.

## Checklist exacta pendiente

- [ ] Crear el proyecto Firebase (ID real pendiente; no inventado).
- [ ] Registrar la aplicación web y obtener el `firebaseConfig` público real: `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId` y `appId`.
- [ ] Activar Google Auth y configurar los dominios autorizados reales.
- [ ] Probar los dos adultos con Google: `agarciatimon@gmail.com` y `luzolivas@gmail.com`; comprobar email verificado y allowlist del backend.
- [ ] Definir y desplegar la identidad infantil compartida sin login propio y el mecanismo supervisado que emita `childRole=child`; comprobar que no se puede falsificar desde el cliente.
- [ ] Crear Firestore en modo producción.
- [ ] Aplicar `firebase.rules.example` tras probarlo en Firebase Emulator Suite; revisar las restricciones de visibilidad de tareas por asignación.
- [ ] Implementar y desplegar Functions/backend para transiciones, historial, idempotencia, premios y balances atómicos.
- [ ] Cargar tareas reales sustituyendo las cuatro de `EJEMPLO`; no hay seed real en este commit.
- [ ] Conectar el adaptador de Google Auth, Firestore y Functions en la app; mantener `backend pendiente` hasta verificarlo.
- [ ] Configurar el origen publicado exacto, CORS si procede, y el despliegue del tablón.
- [ ] Ejecutar pruebas del emulador con ambos adultos, identidad infantil, reintentos, acceso denegado, visibilidad, validación y duplicación concurrente.

No se ejecuta esta checklist desde este repo: requiere proyecto, decisiones de configuración y/o credenciales de Álvaro.

## Pruebas

Sin red ni credenciales:

```sh
node test-app.mjs
node domain.test.mjs
node domain.security.test.mjs
node --check app.js
node --check domain.mjs
node --check config.mjs
git diff --check
```

## Límites actuales

No hay proyecto Firebase, `firebaseConfig` real, login Google, reglas publicadas, sincronización remota ni backend funcionando. El modo local no es seguro y solo sirve para probar la interfaz.

Decisiones de Álvaro pendientes: ninguna dentro de este encargo; queda pendiente únicamente la configuración técnica anterior, que requiere proyecto y credenciales.
