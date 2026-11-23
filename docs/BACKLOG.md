# Backlog de ROBAC

Actualizado el 23 de noviembre de 2026, con los cambios del Sprint 6 (Actividad 7).
Repositorio: <https://github.com/Jorge1x10/PROYECTO-II>

## Historias de usuario

| HU | Historia | Sprint | Estado |
| --- | --- | --- | --- |
| HU1 | Iniciar sesión con correo y contraseña | 1 | Terminada |
| HU2 | Catálogo de permisos y tres roles | 1 | Terminada |
| HU3 | Rutas protegidas por permiso | 1 | Terminada |
| HU4 | Menú con solo las secciones del rol | 1 | Terminada |
| HU5 | Pantalla de inicio con el rol y lo que puede hacer | 1 | Terminada |
| HU6 | Crear usuarios, cambiarles el rol y desactivarlos | 2 | Terminada |
| HU7 | Matriz para activar o retirar permisos por rol | 2 | Terminada |
| HU8 | El residente autoriza visitas | 2 | Terminada |
| HU9 | El guardia registra entrada y salida | 2 | Terminada |
| HU10 | Bitácora con búsqueda | 2 | Terminada |
| HU11 | Servidor y base de datos | 4 | Terminada |
| HU12 | Contraseñas cifradas | 3 | Terminada |
| HU13 | Editar los datos de un usuario | 3 | Terminada |
| HU14 | Cambiar la propia contraseña (Mi cuenta) | 3 | Terminada |
| HU15 | Restablecimiento de contraseña por el administrador | 3 | Terminada |
| HU16 | Recuperar la contraseña con un código de 6 dígitos | 4 | Terminada (el código salía en la consola) |
| **HU17** | **Bloquear el inicio de sesión tras 5 intentos fallidos** | **5** | **Terminada** |
| **HU18** | **Enviar el código de recuperación por correo (SMTP)** | **5** | **Terminada** |
| **HU19** | **Preparar el sistema para publicarse (variables de entorno, ruta de salud, `.gitignore`)** | **5** | **Terminada** |
| HU20 | Publicar el sistema en un servidor con correo real | 6 | Pendiente: requiere la cuenta del servicio de publicación y del correo del equipo |

## Sprint 6: revisión final (Actividad 7)

| HU | Historia | Prioridad | Estado |
| --- | --- | --- | --- |
| HU21 | Unir a la rama `main` la última versión | Alta | Pendiente: falta aprobar el pull request |
| HU22 | Primer administrador sin cuentas de prueba | Alta | Terminada |
| HU23 | Pruebas en GitHub Actions en cada cambio | Media | Terminada |
| HU24 | Quitar de la raíz la copia de los Sprint 1 a 3 | Media | Terminada |
| HU25 | Respaldos de la base de datos | Media | Terminada |
| HU26 | Manual de usuario por rol (`docs/MANUAL_USUARIO.md`) | Media | Terminada |
| HU27 | Bitácora con filtros por fecha, búsqueda y páginas | Baja | Terminada |

Resumen: 27 historias, 25 terminadas, 2 pendientes (HU20 y HU21).

## Pruebas automáticas por Sprint

| Sprint | Pruebas que pasan |
| --- | --- |
| 1 y 2 | 7 |
| 3 | 15 |
| 4 | 52 |
| 5 | 66 |
| 6 | 79 |

## Cambios del Sprint 5 en GitHub

| Fecha | Commit | Historia | Cambio |
| --- | --- | --- | --- |
| 11/11/2026 | [9b83275](https://github.com/Jorge1x10/PROYECTO-II/commit/9b83275) | HU18 | `robac/server/correo.js`: envío del código por SMTP con STARTTLS o TLS |
| 11/11/2026 | [d6c1173](https://github.com/Jorge1x10/PROYECTO-II/commit/d6c1173) | HU17, HU19 | Bloqueo tras 5 intentos fallidos, ruta `/api/salud` y 14 pruebas nuevas |
| 11/11/2026 | [3ca727a](https://github.com/Jorge1x10/PROYECTO-II/commit/3ca727a) | HU19 | `.gitignore`, `.env.example` y README con el Sprint 5 |

## Cambios del Sprint 6 en GitHub

| Fecha | Commit | Historia | Cambio |
| --- | --- | --- | --- |
| 23/11/2026 | [4fa1830](https://github.com/Jorge1x10/PROYECTO-II/commit/4fa1830) | HU22 | Primer administrador por variables de entorno; producción sin cuentas de prueba |
| 23/11/2026 | [a0381fd](https://github.com/Jorge1x10/PROYECTO-II/commit/a0381fd) | HU25 | Respaldos automáticos y `npm run respaldo` |
| 23/11/2026 | [c7c5c14](https://github.com/Jorge1x10/PROYECTO-II/commit/c7c5c14) | HU27 | Bitácora con filtros, búsqueda y páginas |
| 23/11/2026 | [8da5e40](https://github.com/Jorge1x10/PROYECTO-II/commit/8da5e40) | HU23 | Flujo de GitHub Actions |
| 23/11/2026 | [40a83c4](https://github.com/Jorge1x10/PROYECTO-II/commit/40a83c4) | HU24 | Se quita la copia de los Sprint 1 a 3 |
| 23/11/2026 | [68e7add](https://github.com/Jorge1x10/PROYECTO-II/commit/68e7add) | HU26 | Manual de usuario |
| 23/11/2026 | [32f6ac4](https://github.com/Jorge1x10/PROYECTO-II/commit/32f6ac4) | — | README y `.env.example` del Sprint 6 |
