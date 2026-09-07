# Tablón familiar

Estado: backend pendiente. El proyecto Firebase `tablongo` y su configuración pública ya están anotados en `firebase.example.json`; no se afirma que haya sincronización o autenticación funcionando.

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

### Contrato de Cloud Functions/Admin SDK (pendiente de implementación)

El módulo puro `backend.contract.mjs` fija validaciones reutilizables sin SDK;
no conecta Firebase ni simula sincronización. Las Functions deben exponer estas
operaciones callable/HTTP y devolver `{ ok, instance, actionId }` (o un error de
autorización/validación). `eventId` es obligatorio, estable para reintentos, y
una misma clave con payload distinto debe fallar.

| Operación | Entrada | Actor | Transición | Escritura atómica |
|---|---|---|---|---|
| `child_done` | `taskId`, `instanceId`, `eventId` | identidad infantil supervisada | `pending → child_done` | instancia + acción append-only |
| `validate_task` | `taskId`, `instanceId`, `eventId` | adulto allowlist + correo verificado | `child_done → validated` | instancia + acción + premio/balance |
| `adult_done` | `taskId`, `instanceId`, `eventId` | adulto allowlist + correo verificado | `pending → adult_done` | instancia + acción + premio/balance |
| `undo_done` | `taskId`, `instanceId`, `eventId` | adulto allowlist + correo verificado | `child_done/validated/adult_done → pending` | instancia + acción; nunca resta |

La Function debe leer tarea/instancia del servidor, rechazar tareas archivadas o
no activas, derivar puntos y beneficiarios de la tarea (nunca de la petición),
y usar una transacción Firestore. La clave de instancia es `taskId:period`; la
de premio es `instanceId:beneficiary`. El premio solo se crea si el estado final
es `validated` o `adult_done` y no existe aún; después se incrementa el balance
en la misma transacción. Un replay de `eventId` devuelve el resultado guardado
sin repetir efectos. La creación periódica de instancias debe ser un job
confiable: para cada tarea activa, crear idempotentemente `taskId:period` solo si
su frecuencia (diaria o días semanales) coincide; no acepta periodos inventados
por el cliente.

No se deben usar escrituras directas del navegador para estas operaciones: el
cliente solo llama a Functions. Admin SDK omite reglas, por lo que la Function
debe repetir autenticación, allowlist, email verificado, rol infantil
supervisado y autorización de asignación.

Cloud Functions (o un servidor confiable con Admin SDK) debe:

1. Verificar Firebase Auth, email verificado y allowlist adulta en cada llamada; resolver la identidad infantil solo mediante el mecanismo supervisado acordado.
2. Validar que la instancia, tarea, beneficiario y puntos existen y que la transición es válida: niño `pending → child_done`; adulto `child_done → validated`, o `pending → adult_done`; adulto puede deshacer sin borrar historial.
3. Registrar una acción append-only con `actorUid`, rol servidor, timestamp e `idempotencyKey`; rechazar claves reutilizadas con payload distinto y devolver el mismo resultado al reintentar.
4. En una única transacción, comprobar el estado y crear `pointAwards/{instanceId_beneficiary}` con clave determinista. Solo si no existe, sumar el balance. Marcar la instancia como premiada únicamente dentro de esa operación. Nunca aceptar `points`, `actor`, `role` o `balance` del cliente como autoridad.
5. Mantener el historial aunque se deshaga una tarea. Una nueva validación tras un deshacer no debe volver a sumar el mismo premio de la misma instancia.

## Guía para la siguiente fase (no hacer ahora)

La configuración pública y el nombre `tablongo` son documentación, no demuestran que exista una conexión operativa. Cuando Álvaro autorice la siguiente fase, comprobarlo en estas URLs oficiales, sin copiar aquí credenciales ni secretos:

1. Proyecto: [Firebase Console](https://console.firebase.google.com/) → confirmar que el proyecto seleccionado es `tablongo` y que su configuración coincide con `firebase.example.json`.
2. Authentication / Google: [Authentication](https://console.firebase.google.com/project/_/authentication/providers) → comprobar que Google está habilitado y que el acceso funciona para `agarciatimon@gmail.com` y `luzolivas@gmail.com`, con email verificado.
3. Dominios: [Authentication → Settings → Authorized domains](https://console.firebase.google.com/project/_/authentication/settings) → comprobar el origen publicado exacto, `localhost` solo para desarrollo y ningún dominio sobrante.
4. Firestore producción: [Firestore Database](https://console.firebase.google.com/project/_/firestore) → comprobar que la base de producción existe y que no se usa una base de pruebas.
5. Allowlist: comprobar en la autenticación/backend que solo están permitidos `agarciatimon@gmail.com` y `luzolivas@gmail.com`; no confiar en una allowlist escrita por el navegador.
6. Identidad infantil supervisada: acordar y comprobar el mecanismo compartido sin login propio, con autorización supervisada y un `childRole` emitido de forma confiable; verificar que JavaScript no puede falsificarlo.
7. Reglas: revisar y probar `firebase.rules.example` en el [Rules Playground](https://console.firebase.google.com/project/_/firestore/rules) o en un entorno local autorizado; comprobar lectura por asignación, escritura adulta, transición infantil, append-only e idempotencia. No desplegar esta plantilla por el mero hecho de existir.
8. Functions: comprobar en [Functions](https://console.firebase.google.com/project/_/functions) que existe un backend confiable desplegado para autenticación, transiciones, historial, premios y balances atómicos; hoy no existe en esta app.
9. CORS: comprobar que el origen publicado exacto está permitido únicamente donde corresponda y que las peticiones no dependen de credenciales expuestas.
10. Prueba de ambos adultos: repetir login y una operación autorizada con cada cuenta, comprobar rechazo de una cuenta no permitida y verificar los efectos en Firestore sin duplicación.

La facturación puede aparecer al crear Firestore en producción o al desplegar Functions: [Billing](https://console.firebase.google.com/project/_/usage/details). No activar ningún plan, vincular facturación ni aceptar cargos sin autorización expresa de Álvaro.

Checklist de estado documental: proyecto, Authentication/Google y Firestore no están verificados desde este repo; dominios, allowlist, identidad infantil supervisada, reglas, Functions, CORS y prueba de ambos adultos siguen pendientes. No se ejecuta esta guía desde este repo: requiere decisiones y acceso de Álvaro.

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

El proyecto Firebase y su `firebaseConfig` público están documentados, pero no hay login Google conectado en la app, reglas publicadas, sincronización remota ni backend funcionando. El modo local no es seguro y solo sirve para probar la interfaz.

No se activan `TABLON_CONFIG`, login Google, sincronización, reglas, Functions ni Hosting en este encargo. La configuración pública no demuestra que el backend esté operativo.
