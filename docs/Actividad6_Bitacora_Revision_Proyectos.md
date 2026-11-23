---
title: "Actividad 6 — Bitácora de la revisión de los proyectos del equipo"
author: "Jorge Arturo Alvarado Díaz de León"
date: "23 de noviembre de 2026"
---

| Dato | Detalle |
| --- | --- |
| Equipo | Jorge Alvarado, Compañero B y Compañero C (equipo Scrum de 3 integrantes) |
| Proyecto de Jorge | ROBAC: control de acceso basado en roles para comunidades privadas (React, Node y SQLite) |
| Liga de GitHub | <https://github.com/Jorge1x10/PROYECTO-II/tree/claude/busy-carson-vq447d> |
| Objetivo | Revisar los proyectos del equipo, acordar los cambios que faltan y liberarlos el 4 de diciembre de 2026 |

## 1. Bitácora

### Reunión de arranque

Martes 24 de noviembre de 2026, de 19:00 a 20:00, por videollamada en Google Meet. Los avisos van por el canal del equipo en Discord. La reunión se divide en tres bloques de 20 minutos, uno por proyecto. En cada bloque, el Desarrollador muestra su último backlog y su última versión de GitHub, el Product Owner prioriza los cambios y el Scrum Master los anota.

### Calendario de reuniones

| # | Fecha (19:00, Meet) | Reunión | Objetivo | Minuta general |
| --- | --- | --- | --- | --- |
| R1 | Martes 24 nov | Arranque | Revisar backlog y GitHub de los tres proyectos y acordar los cambios | Jorge Alvarado |
| R2 | Viernes 27 nov | Seguimiento 1 | Revisar los cambios de prioridad alta y los bloqueos | Compañero C |
| R3 | Martes 1 dic | Seguimiento 2 | Pruebas cruzadas (cada PO prueba el proyecto que prioriza) y cambios de prioridad media | Compañero B |
| R4 | Viernes 4 dic | Revisión final | Aceptar cada proyecto, confirmar la versión final en GitHub y hacer la retrospectiva | Jorge Alvarado |

### Registro

| Fecha | Actividad | Resultado | Registra |
| --- | --- | --- | --- |
| 23 nov | Preparación | Se revisó ROBAC: backlog con 19 de 20 historias terminadas, última versión en GitHub (commit `8e9412c`, Sprint 5) y 66 pruebas que pasan. Se redactaron las propuestas HU21 a HU27 | Jorge Alvarado |
| 24 nov | R1 Arranque | *[Por completar después de la reunión]* | Jorge Alvarado |
| 27 nov | R2 Seguimiento 1 | *[Por completar]* | Compañero C |
| 1 dic | R3 Seguimiento 2 | *[Por completar]* | Compañero B |
| 4 dic | R4 Revisión final | *[Por completar]* | Jorge Alvarado |

## 2. Propuestas de modificaciones

### ROBAC (Jorge Alvarado)

| HU | Propuesta | Motivo | Prioridad | Reunión |
| --- | --- | --- | --- | --- |
| HU21 | Unir a la rama `main` la última versión | `main` se quedó en el 28 de octubre y no muestra los últimos cambios | Alta | R2 |
| HU22 | Crear el primer administrador con variables de entorno y no cargar las cuentas de prueba al publicar | Hoy la base nueva trae contraseñas conocidas (`admin123`) | Alta | R2 |
| HU20 | Publicar el sistema con un servidor de correo real | Es la única historia pendiente; sin ella el sistema solo corre en local | Alta | R3 |
| HU23 | Correr las 66 pruebas en GitHub Actions en cada cambio | Hoy las pruebas solo se corren a mano | Media | R3 |
| HU24 | Quitar de la raíz la copia de los Sprint 1 a 3 | Hay dos proyectos en el repositorio y se puede ejecutar el viejo por error | Media | R2 |
| HU25 | Respaldar la base de datos SQLite | Si se pierde `robac.db` se pierden usuarios, visitas y bitácora | Media | R3 |
| HU26 | Manual de usuario por rol | Lo necesita quien use el sistema por primera vez | Media | R4 |
| HU27 | Filtrar la bitácora por fechas y paginarla | La pantalla solo muestra los últimos 200 movimientos | Baja | Si hay tiempo |

### Proyecto de Compañero B

| HU | Propuesta | Motivo | Prioridad | Reunión |
| --- | --- | --- | --- | --- |
| *[ ]* | *[Por completar en R1]* | *[ ]* | *[ ]* | *[ ]* |

### Proyecto de Compañero C

| HU | Propuesta | Motivo | Prioridad | Reunión |
| --- | --- | --- | --- | --- |
| *[ ]* | *[Por completar en R1]* | *[ ]* | *[ ]* | *[ ]* |

## 3. Back log

### ROBAC (actualizado al 23 de noviembre de 2026)

| HU | Historia de usuario | Sprint | Estado |
| --- | --- | --- | --- |
| HU1 | Iniciar sesión con correo y contraseña | 1 | Terminada |
| HU2 | Catálogo de permisos y tres roles | 1 | Terminada |
| HU3 | Rutas protegidas por permiso | 1 | Terminada |
| HU4 | Menú con solo las secciones del rol | 1 | Terminada |
| HU5 | Pantalla de inicio con el rol del usuario | 1 | Terminada |
| HU6 | Crear, cambiar de rol y desactivar usuarios | 2 | Terminada |
| HU7 | Matriz de permisos por rol | 2 | Terminada |
| HU8 | El residente autoriza visitas | 2 | Terminada |
| HU9 | El guardia registra entrada y salida | 2 | Terminada |
| HU10 | Bitácora con búsqueda | 2 | Terminada |
| HU11 | Servidor y base de datos | 4 | Terminada |
| HU12 | Contraseñas cifradas | 3 | Terminada |
| HU13 | Editar los datos de un usuario | 3 | Terminada |
| HU14 | Cambiar la propia contraseña | 3 | Terminada |
| HU15 | El administrador restablece contraseñas | 3 | Terminada |
| HU16 | Recuperar la contraseña con un código | 4 | Terminada |
| HU17 | Bloqueo tras 5 intentos fallidos | 5 | Terminada |
| HU18 | Código de recuperación por correo | 5 | Terminada |
| HU19 | Preparar el sistema para publicarse | 5 | Terminada |
| HU20 | Publicar el sistema | 6 | Pendiente (alta) |
| HU21 | Unir los cambios a `main` | 6 | Propuesta (alta) |
| HU22 | Primer administrador sin cuentas de prueba | 6 | Propuesta (alta) |
| HU23 | Pruebas en GitHub Actions | 6 | Propuesta (media) |
| HU24 | Quitar la copia de los Sprint 1 a 3 | 6 | Propuesta (media) |
| HU25 | Respaldo de la base de datos | 6 | Propuesta (media) |
| HU26 | Manual de usuario por rol | 6 | Propuesta (media) |
| HU27 | Filtro por fechas en la bitácora | 6 | Propuesta (baja) |

Avance: 19 de 27 historias terminadas.

### Proyectos de Compañero B y Compañero C

| Proyecto | Último backlog | Última versión en GitHub |
| --- | --- | --- |
| Compañero B | *[Historias terminadas y pendientes]* | *[Liga y commit]* |
| Compañero C | *[Historias terminadas y pendientes]* | *[Liga y commit]* |

## 4. Reporte de roles

Los roles son los mismos del calendario Scrum del 5 de octubre y se mantienen en las cuatro reuniones. Cada integrante desarrolla su proyecto, prioriza el de un compañero y documenta la revisión de otro.

| Proyecto | Desarrollador | Product Owner | Scrum Master |
| --- | --- | --- | --- |
| ROBAC | Jorge Alvarado | Compañero B | Compañero C |
| Proyecto de Compañero B | Compañero B | Compañero C | Jorge Alvarado |
| Proyecto de Compañero C | Compañero C | Jorge Alvarado | Compañero B |

| Rol | Responsabilidad en la revisión |
| --- | --- |
| Desarrollador | Sube la última versión a GitHub, actualiza su backlog, presenta su proyecto y hace los cambios acordados (un commit por historia) |
| Product Owner | Prueba el proyecto, prioriza las propuestas, acepta o rechaza lo entregado y actualiza el backlog |
| Scrum Master | Controla los 20 minutos del bloque, pregunta por bloqueos y escribe la minuta en esta bitácora |

## 5. Liga de GitHub

- Última versión de ROBAC y de esta bitácora: <https://github.com/Jorge1x10/PROYECTO-II/tree/claude/busy-carson-vq447d>
- Repositorio: <https://github.com/Jorge1x10/PROYECTO-II> (la rama `main` se actualizará con la HU21)
- Back log en el repositorio: `docs/BACKLOG.md`
