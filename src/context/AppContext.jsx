import { createContext, useContext, useEffect, useState } from 'react'
import {
  ROLES_INICIALES,
  USUARIOS_INICIALES,
  VISITAS_INICIALES,
} from '../data/seed'
import { cifrarPassword, verificarPassword } from '../utils/passwords'

const AppContext = createContext(null)

const CLAVE_DATOS = 'robac-datos'
const CLAVE_SESION = 'robac-sesion'
const MAX_BITACORA = 200
const MIN_PASSWORD = 6
const SIN_PERMISO = { ok: false, error: 'No tienes permiso para hacer esto.' }

function cargarDatos() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_DATOS))
    if (guardado) return guardado
  } catch {
    // si el almacenamiento falla usamos los datos iniciales
  }
  return {
    usuarios: USUARIOS_INICIALES,
    roles: ROLES_INICIALES,
    visitas: VISITAS_INICIALES,
    bitacora: [],
  }
}

function cargarSesion() {
  try {
    return localStorage.getItem(CLAVE_SESION)
  } catch {
    return null
  }
}

function nuevaEntrada(actor, accion, detalle) {
  return {
    id: crypto.randomUUID(),
    fecha: new Date().toISOString(),
    actor,
    accion,
    detalle,
  }
}

// Devuelve el usuario con su contraseña cifrada y sin rastro de la contraseña en texto plano.
function conClave(usuario, clave) {
  // eslint-disable-next-line no-unused-vars
  const { password, ...resto } = usuario
  return { ...resto, clave }
}

// Comprueba una contraseña contra el usuario (cifrada o, en datos viejos, en texto plano).
async function coincidePassword(usuario, password) {
  if (usuario.clave) return verificarPassword(password, usuario.clave)
  return usuario.password === password
}

export function AppProvider({ children }) {
  const [datos, setDatos] = useState(cargarDatos)
  const [sesionId, setSesionId] = useState(cargarSesion)

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_DATOS, JSON.stringify(datos))
    } catch {
      // sin almacenamiento la app sigue funcionando en memoria
    }
  }, [datos])

  // Migración: los datos guardados en el Sprint 1 y 2 tenían contraseñas en texto plano.
  // Al abrir la app se cifran una sola vez.
  useEffect(() => {
    const pendientes = datos.usuarios.filter((u) => u.password)
    if (pendientes.length === 0) return undefined
    let vigente = true
    Promise.all(
      pendientes.map(async (u) => [u.id, await cifrarPassword(u.password)]),
    ).then((pares) => {
      if (!vigente) return
      const claves = Object.fromEntries(pares)
      setDatos((prev) => ({
        ...prev,
        usuarios: prev.usuarios.map((u) =>
          u.password && claves[u.id] ? conClave(u, claves[u.id]) : u,
        ),
      }))
    })
    return () => {
      vigente = false
    }
    // Solo se ejecuta al abrir la app.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const usuario =
    datos.usuarios.find((u) => u.id === sesionId && u.activo) || null
  const rol = usuario ? datos.roles.find((r) => r.id === usuario.rolId) : null

  // ¿El usuario actual tiene este permiso? Acepta un permiso o una lista (basta uno).
  function tiene(permiso) {
    if (!rol) return false
    const lista = Array.isArray(permiso) ? permiso : [permiso]
    return lista.some((p) => rol.permisos.includes(p))
  }

  // Aplica un cambio a los datos y deja constancia en la bitácora.
  function aplicar(cambio, accion, detalle, actor = usuario?.nombre ?? 'Sistema') {
    setDatos((prev) => {
      const siguiente = cambio(prev)
      const bitacora = [nuevaEntrada(actor, accion, detalle), ...siguiente.bitacora]
      return { ...siguiente, bitacora: bitacora.slice(0, MAX_BITACORA) }
    })
  }

  // ---------- Sesión ----------
  async function iniciarSesion(correo, password) {
    const u = datos.usuarios.find(
      (x) => x.correo.toLowerCase() === correo.trim().toLowerCase(),
    )
    if (!u || !(await coincidePassword(u, password))) {
      return { ok: false, error: 'Correo o contraseña incorrectos.' }
    }
    if (!u.activo) {
      return {
        ok: false,
        error: 'Tu cuenta está desactivada. Contacta al administrador.',
      }
    }
    try {
      localStorage.setItem(CLAVE_SESION, u.id)
    } catch {
      // la sesión vive en memoria si no hay almacenamiento
    }
    setSesionId(u.id)
    aplicar((prev) => prev, 'Inicio de sesión', 'Acceso al sistema', u.nombre)
    return { ok: true }
  }

  function cerrarSesion() {
    if (usuario) aplicar((prev) => prev, 'Cierre de sesión', 'Salida del sistema')
    try {
      localStorage.removeItem(CLAVE_SESION)
    } catch {
      // nada que limpiar
    }
    setSesionId(null)
  }

  // ---------- Mi cuenta ----------
  async function cambiarMiPassword(actual, nueva) {
    if (!(await coincidePassword(usuario, actual))) {
      return { ok: false, error: 'La contraseña actual no es correcta.' }
    }
    if (nueva.length < MIN_PASSWORD) {
      return {
        ok: false,
        error: `La nueva contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`,
      }
    }
    if (nueva === actual) {
      return { ok: false, error: 'La nueva contraseña debe ser distinta de la actual.' }
    }
    const clave = await cifrarPassword(nueva)
    aplicar(
      (prev) => ({
        ...prev,
        usuarios: prev.usuarios.map((u) =>
          u.id === usuario.id ? conClave(u, clave) : u,
        ),
      }),
      'Contraseña cambiada',
      usuario.nombre,
    )
    return { ok: true }
  }

  // ---------- Usuarios ----------
  async function crearUsuario({ nombre, correo, password, rolId, casa }) {
    if (!tiene('usuarios.gestionar')) return SIN_PERMISO
    const existe = datos.usuarios.some(
      (u) => u.correo.toLowerCase() === correo.trim().toLowerCase(),
    )
    if (existe) return { ok: false, error: 'Ya existe un usuario con ese correo.' }
    const nuevo = {
      id: crypto.randomUUID(),
      nombre: nombre.trim(),
      correo: correo.trim(),
      clave: await cifrarPassword(password),
      rolId,
      casa: casa.trim() || '—',
      activo: true,
    }
    aplicar(
      (prev) => ({ ...prev, usuarios: [...prev.usuarios, nuevo] }),
      'Usuario creado',
      `${nuevo.nombre} (${rolId})`,
    )
    return { ok: true }
  }

  function editarUsuario(id, { nombre, correo, casa }) {
    if (!tiene('usuarios.gestionar')) return SIN_PERMISO
    const objetivo = datos.usuarios.find((u) => u.id === id)
    if (!objetivo) return { ok: false, error: 'El usuario ya no existe.' }
    if (!nombre.trim()) return { ok: false, error: 'El nombre no puede estar vacío.' }
    const repetido = datos.usuarios.some(
      (u) => u.id !== id && u.correo.toLowerCase() === correo.trim().toLowerCase(),
    )
    if (repetido) return { ok: false, error: 'Ya existe un usuario con ese correo.' }
    aplicar(
      (prev) => ({
        ...prev,
        usuarios: prev.usuarios.map((u) =>
          u.id === id
            ? {
                ...u,
                nombre: nombre.trim(),
                correo: correo.trim(),
                casa: casa.trim() || '—',
              }
            : u,
        ),
      }),
      'Datos de usuario editados',
      objetivo.nombre,
    )
    return { ok: true }
  }

  // Recuperación asistida: el administrador asigna una contraseña temporal.
  async function restablecerPassword(id, nueva) {
    if (!tiene('usuarios.gestionar')) return SIN_PERMISO
    const objetivo = datos.usuarios.find((u) => u.id === id)
    if (!objetivo) return { ok: false, error: 'El usuario ya no existe.' }
    if (nueva.length < MIN_PASSWORD) {
      return {
        ok: false,
        error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`,
      }
    }
    const clave = await cifrarPassword(nueva)
    aplicar(
      (prev) => ({
        ...prev,
        usuarios: prev.usuarios.map((u) => (u.id === id ? conClave(u, clave) : u)),
      }),
      'Contraseña restablecida',
      objetivo.nombre,
    )
    return { ok: true }
  }

  function cambiarRolUsuario(id, rolId) {
    if (!tiene('usuarios.gestionar')) return SIN_PERMISO
    const objetivo = datos.usuarios.find((u) => u.id === id)
    aplicar(
      (prev) => ({
        ...prev,
        usuarios: prev.usuarios.map((u) => (u.id === id ? { ...u, rolId } : u)),
      }),
      'Rol cambiado',
      `${objetivo.nombre}: ${objetivo.rolId} → ${rolId}`,
    )
    return { ok: true }
  }

  function alternarActivo(id) {
    if (!tiene('usuarios.gestionar')) return SIN_PERMISO
    const objetivo = datos.usuarios.find((u) => u.id === id)
    aplicar(
      (prev) => ({
        ...prev,
        usuarios: prev.usuarios.map((u) =>
          u.id === id ? { ...u, activo: !u.activo } : u,
        ),
      }),
      objetivo.activo ? 'Usuario desactivado' : 'Usuario activado',
      objetivo.nombre,
    )
    return { ok: true }
  }

  // ---------- Roles y permisos ----------
  function alternarPermiso(rolId, permisoId) {
    if (!tiene('roles.gestionar')) return SIN_PERMISO
    const r = datos.roles.find((x) => x.id === rolId)
    const concede = !r.permisos.includes(permisoId)
    aplicar(
      (prev) => ({
        ...prev,
        roles: prev.roles.map((x) =>
          x.id === rolId
            ? {
                ...x,
                permisos: concede
                  ? [...x.permisos, permisoId]
                  : x.permisos.filter((p) => p !== permisoId),
              }
            : x,
        ),
      }),
      concede ? 'Permiso concedido' : 'Permiso retirado',
      `${permisoId} → ${r.nombre}`,
    )
    return { ok: true }
  }

  // ---------- Visitas ----------
  function autorizarVisita({ visitante, fecha }) {
    if (!tiene('visitas.autorizar')) return SIN_PERMISO
    const nueva = {
      id: crypto.randomUUID(),
      visitante: visitante.trim(),
      fecha,
      residenteId: usuario.id,
      estado: 'autorizada',
    }
    aplicar(
      (prev) => ({ ...prev, visitas: [nueva, ...prev.visitas] }),
      'Visita autorizada',
      `${nueva.visitante} para ${usuario.casa}`,
    )
    return { ok: true }
  }

  function cambiarEstadoVisita(id, estado) {
    const visita = datos.visitas.find((v) => v.id === id)
    const esDueno = visita?.residenteId === usuario?.id
    const permitido =
      estado === 'cancelada'
        ? esDueno || tiene('visitas.registrar')
        : tiene('visitas.registrar')
    if (!visita || !permitido) return SIN_PERMISO
    const acciones = {
      dentro: 'Entrada registrada',
      salio: 'Salida registrada',
      cancelada: 'Visita cancelada',
    }
    aplicar(
      (prev) => ({
        ...prev,
        visitas: prev.visitas.map((v) => (v.id === id ? { ...v, estado } : v)),
      }),
      acciones[estado],
      visita.visitante,
    )
    return { ok: true }
  }

  const valor = {
    ...datos,
    usuario,
    rol,
    tiene,
    iniciarSesion,
    cerrarSesion,
    cambiarMiPassword,
    crearUsuario,
    editarUsuario,
    restablecerPassword,
    cambiarRolUsuario,
    alternarActivo,
    alternarPermiso,
    autorizarVisita,
    cambiarEstadoVisita,
  }

  return <AppContext.Provider value={valor}>{children}</AppContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  return useContext(AppContext)
}
