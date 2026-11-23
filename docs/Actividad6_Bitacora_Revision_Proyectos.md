---
title: "Actividad 6 — Bitácora de la revisión de los proyectos del equipo"
author: "Jorge Arturo Alvarado Díaz de León"
date: "23 de noviembre de 2026"
---

## Resumen

El equipo Scrum de 3 integrantes (Jorge Alvarado, Compañero B y Compañero C) entra a la última unidad del curso con un sistema por integrante. Esta bitácora planea la revisión final de los tres antes de liberarlos para su uso. Para cada sistema se toma su último backlog y su última versión en GitHub, se proponen las modificaciones que faltan para terminarlo y se fija un calendario de cuatro reuniones con el rol de cada participante.

Para no cambiar de reglas al final del curso, los roles son los mismos que el equipo acordó en el calendario Scrum del 5 de octubre (`Calendario_Reuniones_SCRUM.pdf`).

## 1. Reunión de arranque

| Dato | Detalle |
| --- | --- |
| Fecha | Martes 24 de noviembre de 2026, 19:00 a 20:00 (hora del centro de México) |
| Modalidad | Videollamada en Google Meet; convocatoria y enlaces por el canal del equipo en Discord |
| Convoca | Jorge Alvarado (convocatoria enviada el 23 de noviembre) |
| Qué traer | De cada sistema: el enlace de GitHub, el último commit y el backlog actualizado |
| Objetivo | Revisar los tres sistemas, acordar las modificaciones de cada uno y aprobar el calendario de la sección 4 |

### Agenda (60 minutos)

| Bloque | Sistema | Tiempo |
| --- | --- | --- |
| 1 | ROBAC (Dev: Jorge Alvarado) | 20 min |
| 2 | Sistema de Compañero B | 20 min |
| 3 | Sistema de Compañero C | 20 min |

En cada bloque, el Desarrollador muestra el backlog y la última versión de GitHub, el Product Owner prioriza las propuestas y el Scrum Master las anota en esta bitácora.

## 2. Revisión de los proyectos

### Sistema de Jorge Alvarado: ROBAC

| Dato | Detalle |
| --- | --- |
| Descripción | Control de acceso basado en roles para comunidades privadas, cotos y residenciales (React, Node, Express y SQLite) |
| Repositorio | <https://github.com/Jorge1x10/PROYECTO-II> |
| Última versión | Commit `8e9412c` del 11 de noviembre de 2026, en la rama `claude/busy-carson-vq447d` |
| Versión en `main` | Commit `384a807` del 28 de octubre de 2026: todavía no incluye el Sprint 5 |
| Backlog | 20 historias: 19 terminadas y 1 pendiente (HU20, publicar el sistema). Detalle en `docs/BACKLOG.md` |
| Pruebas | 66 pruebas automáticas, todas pasan |
| Estado | Funciona completo en local; falta publicarlo y cerrar los puntos de seguridad de la sección 3 |

### Sistema de Compañero B

| Dato | Detalle |
| --- | --- |
| Descripción | *[Por completar por Compañero B]* |
| Repositorio | *[Enlace de GitHub]* |
| Última versión | *[Commit y fecha]* |
| Backlog | *[Historias terminadas y pendientes]* |
| Estado | *[Por completar]* |

### Sistema de Compañero C

| Dato | Detalle |
| --- | --- |
| Descripción | *[Por completar por Compañero C]* |
| Repositorio | *[Enlace de GitHub]* |
| Última versión | *[Commit y fecha]* |
| Backlog | *[Historias terminadas y pendientes]* |
| Estado | *[Por completar]* |

## 3. Propuestas de modificaciones

### ROBAC

| HU | Propuesta | Por qué | Prioridad | Se revisa en |
| --- | --- | --- | --- | --- |
| HU21 | Unir el Sprint 5 a la rama `main` | `main` se quedó en el 28 de octubre; quien abra el repositorio no ve el correo ni el bloqueo de intentos | Alta | R2 |
| HU22 | Crear el primer administrador con variables de entorno y no cargar las cuentas de prueba al publicar | Hoy la base nueva trae cuentas con contraseñas conocidas (`admin123`) y la pantalla de inicio las muestra | Alta | R2 |
| HU20 | Publicar el sistema con un servidor de correo real | Única historia pendiente del backlog; sin ella nadie puede usar el sistema fuera de la computadora del desarrollador | Alta | R3 |
| HU23 | Correr las pruebas en GitHub Actions en cada cambio | Hoy las pruebas solo se corren a mano; así ningún cambio llega a `main` sin pasar las 66 | Media | R3 |
| HU24 | Quitar de la raíz la copia de los Sprint 1 a 3 (`src/`, `package.json` y demás) | Hay dos proyectos en el repositorio y se presta a ejecutar la versión vieja | Media | R2 |
| HU25 | Respaldar la base de datos SQLite | Si se pierde el archivo `robac.db` se pierden usuarios, visitas y bitácora | Media | R3 |
| HU26 | Manual de usuario breve por rol (administrador, guardia, residente) | Hace falta para liberar el sistema a personas que no lo conocen | Media | R4 |
| HU27 | Filtrar la bitácora por fechas y paginarla | La pantalla solo muestra los últimos 200 movimientos | Baja | Si hay tiempo |

Propone: Jorge Alvarado (Dev). Valida y prioriza: Compañero B (PO de ROBAC) en la reunión de arranque.

### Sistema de Compañero B

| HU | Propuesta | Por qué | Prioridad | Se revisa en |
| --- | --- | --- | --- | --- |
| *[ ]* | *[Por completar en la reunión de arranque]* | *[ ]* | *[ ]* | *[ ]* |

### Sistema de Compañero C

| HU | Propuesta | Por qué | Prioridad | Se revisa en |
| --- | --- | --- | --- | --- |
| *[ ]* | *[Por completar en la reunión de arranque]* | *[ ]* | *[ ]* | *[ ]* |

## 4. Calendario de reuniones

Todas son virtuales (Google Meet), duran 1 hora y se dividen en tres bloques de 20 minutos, uno por sistema.

| # | Fecha | Reunión | Objetivo | Responsable de la minuta general |
| --- | --- | --- | --- | --- |
| R1 | Martes 24 nov 2026, 19:00 | Arranque de la revisión | Revisar backlog y GitHub de los tres sistemas, acordar las propuestas y aprobar este calendario | Jorge Alvarado |
| R2 | Viernes 27 nov 2026, 19:00 | Seguimiento 1 | Revisar las modificaciones de prioridad alta y los bloqueos | Compañero C |
| R3 | Martes 1 dic 2026, 19:00 | Seguimiento 2 y pruebas cruzadas | Cada integrante prueba el sistema de otro según su rol de PO; revisar las modificaciones de prioridad media | Compañero B |
| R4 | Viernes 4 dic 2026, 19:00 | Revisión final y liberación | Aceptar o rechazar cada sistema, confirmar que `main` tiene la última versión y hacer la retrospectiva final | Jorge Alvarado |

Si una reunión se cae, se repite al día siguiente a la misma hora. El responsable de la minuta general avisa en el canal del equipo.

## 5. Rol de cada participante

### Roles por sistema (se mantienen en las cuatro reuniones)

| Sistema | Desarrollador | Product Owner | Scrum Master |
| --- | --- | --- | --- |
| ROBAC | Jorge Alvarado | Compañero B | Compañero C |
| Sistema de Compañero B | Compañero B | Compañero C | Jorge Alvarado |
| Sistema de Compañero C | Compañero C | Jorge Alvarado | Compañero B |

Así, cada integrante desarrolla su sistema, prioriza el de un compañero y documenta la revisión del otro.

### Qué hace cada rol en la revisión

| Rol | Antes de la reunión | Durante la reunión | Después de la reunión |
| --- | --- | --- | --- |
| Desarrollador | Sube a GitHub la última versión y actualiza su backlog | Muestra el sistema funcionando y lo que cambió desde la reunión anterior | Hace las modificaciones acordadas, una historia por commit |
| Product Owner | Revisa el backlog y prueba el sistema | Prioriza las propuestas y acepta o rechaza lo entregado | Registra en el backlog lo que se aceptó y lo que se pospuso |
| Scrum Master | Confirma que el enlace de GitHub y el backlog estén al día | Controla los 20 minutos del bloque y pregunta por bloqueos | Escribe la minuta del bloque en esta bitácora (sección 6) |

### Rol de Jorge Alvarado en cada sistema

| Sistema | Rol | Qué documenta |
| --- | --- | --- |
| ROBAC | Desarrollador | Los cambios en GitHub y el backlog de ROBAC |
| Sistema de Compañero B | Scrum Master | La minuta del bloque 2 en cada reunión |
| Sistema de Compañero C | Product Owner | La priorización y la aceptación de las propuestas del sistema de Compañero C |

## 6. Bitácora

| Fecha | Reunión o actividad | Qué se hizo | Acuerdos y pendientes | Registra |
| --- | --- | --- | --- | --- |
| 23 nov 2026 | Preparación | Se revisó ROBAC: último backlog (19 de 20 historias), última versión en GitHub (`8e9412c`) y 66 pruebas que pasan. Se redactaron las propuestas HU21 a HU27 y este calendario | Enviar la convocatoria de R1 y pedir a cada integrante su enlace de GitHub y su backlog | Jorge Alvarado |
| 24 nov 2026 | R1 Arranque | *[Por completar después de la reunión]* | *[ ]* | Jorge Alvarado |
| 27 nov 2026 | R2 Seguimiento 1 | *[ ]* | *[ ]* | Compañero C |
| 1 dic 2026 | R3 Seguimiento 2 | *[ ]* | *[ ]* | Compañero B |
| 4 dic 2026 | R4 Revisión final | *[ ]* | *[ ]* | Jorge Alvarado |

## 7. Repositorio en GitHub

Repositorio del sistema ROBAC: <https://github.com/Jorge1x10/PROYECTO-II>

Esta bitácora y el backlog actualizado con las propuestas HU21 a HU27 están en la carpeta `docs/` del repositorio.
