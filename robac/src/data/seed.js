// Datos iniciales de ROBAC (simulan una base de datos mientras no hay backend).

// Catálogo de permisos del sistema
export const PERMISOS = [
  { id: 'usuarios.ver', nombre: 'Ver usuarios' },
  { id: 'usuarios.gestionar', nombre: 'Crear, editar y desactivar usuarios' },
  { id: 'roles.gestionar', nombre: 'Gestionar roles y permisos' },
  { id: 'visitas.autorizar', nombre: 'Autorizar visitas propias' },
  { id: 'visitas.registrar', nombre: 'Registrar entradas y salidas de visitas' },
  { id: 'bitacora.ver', nombre: 'Consultar la bitácora de accesos' },
]

export const ROLES_INICIALES = [
  {
    id: 'admin',
    nombre: 'Administrador',
    permisos: PERMISOS.map((p) => p.id),
  },
  {
    id: 'guardia',
    nombre: 'Guardia',
    permisos: ['visitas.registrar', 'bitacora.ver'],
  },
  {
    id: 'residente',
    nombre: 'Residente',
    permisos: ['visitas.autorizar'],
  },
]

// Contraseñas en texto plano solo porque es una demo sin backend.
export const USUARIOS_INICIALES = [
  {
    id: 'u1',
    nombre: 'Ana Administradora',
    correo: 'admin@robac.mx',
    password: 'admin123',
    rolId: 'admin',
    casa: '—',
    activo: true,
  },
  {
    id: 'u2',
    nombre: 'Gustavo Guardia',
    correo: 'guardia@robac.mx',
    password: 'guardia123',
    rolId: 'guardia',
    casa: '—',
    activo: true,
  },
  {
    id: 'u3',
    nombre: 'Rosa Residente',
    correo: 'residente@robac.mx',
    password: 'residente123',
    rolId: 'residente',
    casa: 'Casa 12',
    activo: true,
  },
  {
    id: 'u4',
    nombre: 'Mario Mudado',
    correo: 'mario@robac.mx',
    password: 'mario123',
    rolId: 'residente',
    casa: 'Casa 7',
    activo: false,
  },
]

export const VISITAS_INICIALES = []
