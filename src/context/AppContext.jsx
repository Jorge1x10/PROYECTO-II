import { createContext, useContext, useEffect, useState } from 'react'
import {
  ROLES_INICIALES,
  USUARIOS_INICIALES,
  VISITAS_INICIALES,
} from '../data/seed'

const AppContext = createContext(null)

const CLAVE_DATOS = 'robac-datos'
const CLAVE_SESION = 'robac-sesion'
const MAX_BITACORA = 200

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
  function iniciarSesion(correo, password) {
    const u = datos.usuarios.find(
      (x) => x.correo.toLowerCase() === correo.trim().toLowerCase(),
    )
    if (!u || u.password !== password) {
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

  // ---------- Usuarios ----------
  function crearUsuario({ nombre, correo, password, rolId, casa }) {
    const existe = datos.usuarios.some(
      (u) => u.correo.toLowerCase() === correo.trim().toLowerCase(),
    )
    if (existe) return { ok: false, error: 'Ya existe un usuario con ese correo.' }
    const nuevo = {
      id: crypto.randomUUID(),
      nombre: nombre.trim(),
      correo: correo.trim(),
      password,
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

  function cambiarRolUsuario(id, rolId) {
    const objetivo = datos.usuarios.find((u) => u.id === id)
    aplicar(
      (prev) => ({
        ...prev,
        usuarios: prev.usuarios.map((u) => (u.id === id ? { ...u, rolId } : u)),
      }),
      'Rol cambiado',
      `${objetivo.nombre}: ${objetivo.rolId} → ${rolId}`,
    )
  }

  function alternarActivo(id) {
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
  }

  // ---------- Roles y permisos ----------
  function alternarPermiso(rolId, permisoId) {
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
  }

  // ---------- Visitas ----------
  function autorizarVisita({ visitante, fecha }) {
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
  }

  function cambiarEstadoVisita(id, estado) {
    const visita = datos.visitas.find((v) => v.id === id)
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
  }

  const valor = {
    ...datos,
    usuario,
    rol,
    tiene,
    iniciarSesion,
    cerrarSesion,
    crearUsuario,
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
