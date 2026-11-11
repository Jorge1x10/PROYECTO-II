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
los permisos y las cuentas de prueba. Para empezar de cero, borra esa carpeta.

```bash
npm test         # 66 pruebas automáticas (Vitest)
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
  seed.js             Permisos, roles y cuentas de prueba
  api.test.js         32 pruebas de la API
  sprint5.test.js     13 pruebas del Sprint 5 (intentos fallidos y correo)
src/
  api/client.js       Cliente de la API (fetch y token de sesión)
  context/            Estado global de React: sesión y datos según el rol
  components/         Layout (menú por rol) y ProtectedRoute
  pages/              Login, Recuperar, Dashboard, Usuarios, Roles, Visitas, Bitácora, Mi cuenta
  test/               21 pruebas de las pantallas, contra el servidor real
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
`PORT` (la que asigne el servicio), `ROBAC_DB` en un disco persistente y las variables
`SMTP_*`. Verificación de salud: `/api/salud`. Antes de abrirlo a personas reales hay que
cambiar las contraseñas de las cuentas de prueba.

## Pendiente

- Publicar el sistema en un servidor: requiere la cuenta del servicio de publicación y del
  correo del equipo (decisión del Product Owner)
