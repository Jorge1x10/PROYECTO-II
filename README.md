# PROYECTO-II: ROBAC

Sistema de control de acceso basado en roles (RBAC) para comunidades privadas, cotos y
residenciales, desarrollado en React con un servidor en Node (Express y SQLite).

## Dónde está cada cosa

| Carpeta | Contenido |
| --- | --- |
| `robac/` | **Versión final del sistema (Sprint 1 a 4).** Aquí está el código vigente y su `README.md` con las instrucciones |
| `docs/` | Documentos de las actividades: avances, segundo y tercer progreso y reporte final |
| `Calendario_Reuniones_SCRUM.pdf` | Calendario de las reuniones Scrum |

Los archivos `src/`, `package.json` y los demás que están en la raíz son la copia de los
Sprint 1 a 3, anterior al servidor, y se conservan solo como historial.

## Cómo ejecutar la versión final

```bash
cd robac
npm install
npm run build
npm start        # http://127.0.0.1:3001
```

Requiere Node 22.13 o superior. Las cuentas de prueba y el resto de las instrucciones están en
[`robac/README.md`](robac/README.md).
