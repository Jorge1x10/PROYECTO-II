# ROBAC

Sistema de control de acceso basado en roles (RBAC) para comunidades privadas,
cotos y residenciales. Hecho con React (Vite) y React Router.

Por ahora los datos se guardan en el navegador (`localStorage`); el backend y la
base de datos están planeados para el Sprint 3.

## Cómo ejecutarlo

```bash
npm install
npm run dev      # servidor de desarrollo
npm test         # pruebas automáticas (Vitest)
npm run build    # versión de producción
```

## Cuentas de prueba

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Administrador | admin@robac.mx | admin123 |
| Guardia | guardia@robac.mx | guardia123 |
| Residente | residente@robac.mx | residente123 |

## Estructura

```text
src/
  data/seed.js            Catálogo de permisos, roles y usuarios iniciales
  context/AppContext.jsx  Estado global: sesión, usuarios, roles, visitas, bitácora
  components/             Layout (menú por rol) y ProtectedRoute
  pages/                  Login, Dashboard, Usuarios, Roles, Visitas, Bitácora, Mi cuenta
  utils/passwords.js      Cifrado de contraseñas (PBKDF2 con sal)
  test/                   Pruebas: robac (Sprint 1 y 2), cripto y sprint3 (Sprint 3)
```

## Sprint 1: acceso y roles

- Inicio de sesión con correo y contraseña (`Login.jsx`)
- Catálogo de permisos y roles: Administrador, Guardia, Residente (`seed.js`)
- Rutas protegidas por permiso (`ProtectedRoute.jsx`)
- Menú que muestra solo lo permitido (`Layout.jsx`)
- Pantalla de inicio con el resumen del rol (`Dashboard.jsx`)

## Sprint 2: gestión y operación

- Alta de usuarios, cambio de rol y desactivación (`Usuarios.jsx`)
- Matriz para activar o retirar permisos por rol (`Roles.jsx`)
- Residente autoriza visitas; guardia registra entrada y salida (`Visitas.jsx`)
- Bitácora con búsqueda de todos los movimientos (`Bitacora.jsx`)

## Sprint 3: seguridad de cuentas y administración

- Contraseñas cifradas con PBKDF2 y sal aleatoria; migración de los datos guardados en texto plano (`passwords.js`, `AppContext.jsx`)
- Pantalla Mi cuenta para cambiar la propia contraseña (`MiCuenta.jsx`)
- Edición de los datos de un usuario existente (`Usuarios.jsx`)
- Restablecimiento de contraseña por el administrador (`Usuarios.jsx`)
- Los permisos también se validan en la lógica, no solo en la interfaz (`AppContext.jsx`)

## Pendiente (Sprint 4)

- Backend y base de datos
- Recuperación de contraseña por correo
