# ROBAC

Sistema de control de acceso basado en roles (RBAC) para comunidades privadas,
cotos y residenciales. Interfaz en React (Vite y React Router) y servidor en
Node (Express) con base de datos SQLite.

## Cómo ejecutarlo

Requiere Node 22.13 o superior.

```bash
npm install

# Opción A: desarrollo (dos terminales)
npm run server   # API en http://127.0.0.1:3001
npm run dev      # React en http://localhost:5173 (redirige /api al servidor)

# Opción B: una sola terminal, con la versión compilada
npm run build
npm start        # todo en http://127.0.0.1:3001
```

La base de datos se crea sola en `data/robac.db` la primera vez, con los roles,
los permisos y las cuentas de prueba. Para empezar de cero, borra esa carpeta. Para usar
ROBAC con personas reales, crea la base con tu propio administrador (ver Sprint 6).

```bash
npm test         # 79 pruebas automáticas (Vitest)
npm run respaldo # copia de la base de datos en data/respaldos
npm run lint
```

## Cuentas de prueba

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Administrador | admin@robac.mx | admin123 |
| Guardia | guardia@robac.mx | guardia123 |
| Residente | residente@robac.mx | residente123 |

## Estructura

```text
server/
  index.js            Arranque del servidor
  app.js              API: sesión, usuarios, roles, visitas, bitácora y recuperación
  db.js               Tablas de SQLite y carga de datos iniciales
  auth.js             Cifrado de contraseñas (PBKDF2), tokens y códigos
  correo.js           Envío del código de recuperación por SMTP (sin dependencias)
  respaldo.js         Respaldos de la base de datos (VACUUM INTO, se conservan 7)
  respaldar.js        Respaldo manual: npm run respaldo
  seed.js             Permisos, roles y cuentas de prueba
  api.test.js         32 pruebas de la API
  sprint5.test.js     13 pruebas del Sprint 5 (intentos fallidos y correo)
  sprint6.test.js     10 pruebas del Sprint 6 (administrador, respaldos y bitácora)
src/
  api/client.js       Cliente de la API (fetch y token de sesión)
  context/            Estado global de React: sesión y datos según el rol
  components/         Layout (menú por rol) y ProtectedRoute
  pages/              Login, Recuperar, Dashboard, Usuarios, Roles, Visitas, Bitácora, Mi cuenta
  test/               24 pruebas de las pantallas, contra el servidor real
```

## Sprint 1: acceso y roles

- Inicio de sesión con correo y contraseña (`Login.jsx`)
- Catálogo de permisos y tres roles: Administrador, Guardia, Residente
- Rutas protegidas por permiso (`ProtectedRoute.jsx`)
- Menú que muestra solo lo permitido (`Layout.jsx`)
- Pantalla de inicio con el resumen del rol (`Dashboard.jsx`)

## Sprint 2: gestión y operación

- Alta de usuarios, cambio de rol y desactivación (`Usuarios.jsx`)
- Matriz para activar o retirar permisos por rol (`Roles.jsx`)
- Residente autoriza visitas; guardia registra entrada y salida (`Visitas.jsx`)
- Bitácora con búsqueda de todos los movimientos (`Bitacora.jsx`)

## Sprint 3: seguridad de cuentas y administración

- Contraseñas cifradas con PBKDF2 y sal aleatoria
- Pantalla Mi cuenta para cambiar la propia contraseña (`MiCuenta.jsx`)
- Edición de los datos de un usuario existente (`Usuarios.jsx`)
- Restablecimiento de contraseña por el administrador (`Usuarios.jsx`)
- Los permisos también se validan en la lógica, no solo en la interfaz

## Sprint 4: servidor y base de datos

- Servidor Express con base de datos SQLite: usuarios, roles, permisos, visitas y
  bitácora se guardan en el servidor y no en el navegador (`server/`)
- Sesiones con token aleatorio; en la base solo se guarda su huella y vencen a las 8 horas
- Todos los permisos y reglas se validan en el servidor (respuestas 401, 403, 409)
- El cifrado de contraseñas pasó del navegador al servidor
- Recuperación de contraseña con código de 6 dígitos de un solo uso (`Recuperar.jsx`)
- React conectado a la API: la sesión sobrevive a recargar la página y cada pantalla
  carga solo lo que permite el rol (`api/client.js`, `AppContext.jsx`)

### Recuperación de contraseña

El código dura 15 minutos, se puede intentar 5 veces y no se puede pedir otro antes de
un minuto. La respuesta es la misma exista o no el correo. Desde el Sprint 5 el código se
envía por correo si se configura SMTP (ver abajo); si no, se escribe en la consola donde
corre `npm run server`.

## Sprint 5: mejoras de la reunión de revisión

- **Límite de intentos fallidos (HU17):** tras 5 contraseñas incorrectas en 15 minutos, el
  correo queda bloqueado 15 minutos (respuesta 429), aunque después se use la contraseña
  correcta. Se cuenta igual para correos que no existen, para no revelar quién tiene cuenta.
  El bloqueo queda en la bitácora y se quita al recuperar la contraseña o cuando el
  administrador la restablece.
- **Código de recuperación por correo (HU18):** `server/correo.js` envía el código por SMTP
  con STARTTLS o TLS directo, escrito con los módulos `net` y `tls` de Node, sin
  dependencias nuevas. Nunca manda la contraseña del correo por una conexión sin cifrar.
- **Preparación para publicar (HU19):** configuración por variables de entorno
  (`.env.example`), ruta `GET /api/salud` para el servicio de publicación y `.gitignore`
  para no subir `node_modules`, la base de datos ni el archivo `.env`.

### Configurar el correo

```bash
SMTP_HOST=smtp.ejemplo.mx SMTP_PUERTO=587 SMTP_USUARIO=avisos@ejemplo.mx \
SMTP_CLAVE=... SMTP_REMITENTE=avisos@ejemplo.mx npm start
```

Al arrancar, el servidor indica en la consola si los códigos van por SMTP o a la consola.

### Publicar

En un servicio de Node (por ejemplo Render o Railway): comando de compilación
`npm ci && npm run build`, comando de inicio `npm start`, variables `HOST=0.0.0.0`,
`PORT` (la que asigne el servicio), `ROBAC_DB` en un disco persistente, las variables
`SMTP_*`, `NODE_ENV=production` y el primer administrador (`ROBAC_ADMIN_*`, ver Sprint 6).
Verificación de salud: `/api/salud`.

## Sprint 6: revisión final

- **Primer administrador (HU22):** con `ROBAC_ADMIN_CORREO`, `ROBAC_ADMIN_CLAVE` (mínimo 8
  caracteres) y opcionalmente `ROBAC_ADMIN_NOMBRE`, la base nueva se crea solo con ese
  administrador, sin cuentas de prueba. Con `NODE_ENV=production` el servidor se niega a
  arrancar sin administrador o con una base que tenga las cuentas de prueba. La pantalla de
  inicio solo muestra las cuentas de prueba si existen.
- **Pruebas en GitHub (HU23):** `.github/workflows/pruebas.yml` corre el lint, las pruebas y
  la compilación en cada cambio que se sube.
- **Repositorio limpio (HU24):** se quitó de la raíz la copia de los Sprint 1 a 3.
- **Respaldos (HU25):** al arrancar y cada 24 horas se guarda una copia de la base en
  `data/respaldos` y se conservan las últimas 7. `ROBAC_RESPALDO_HORAS=0` los desactiva y
  `ROBAC_RESPALDOS` cambia la carpeta. Para restaurar, detén el servidor y copia el
  respaldo sobre `robac.db`.
- **Manual de usuario (HU26):** [`docs/MANUAL_USUARIO.md`](../docs/MANUAL_USUARIO.md).
- **Bitácora con filtros (HU27):** búsqueda en todo el historial, rango de fechas y páginas
  de 50 movimientos (`GET /api/bitacora?buscar=&desde=&hasta=&pagina=`).

```bash
ROBAC_ADMIN_CORREO=admin@micoto.mx ROBAC_ADMIN_CLAVE=una-clave-larga \
ROBAC_ADMIN_NOMBRE="Laura Jefa" npm start
```

El administrador solo se usa al crear la base; si la base ya existe, no se modifica.

## Pendiente

- Publicar el sistema en un servidor: requiere la cuenta del servicio de publicación y del
  correo del equipo (decisión del Product Owner)
