import { createContext, useContext, useEffect, useState } from 'react'
import { guardarToken, leerToken, pedir } from '../api/client'

const AppContext = createContext(null)

const DATOS_VACIOS = { usuarios: [], roles: [], visitas: [], bitacora: [] }

// Cada pantalla pide solo lo que el rol de la persona le permite ver.
async function cargarDatos(permisos) {
  const tiene = (...lista) => lista.some((p) => permisos.includes(p))
  const [usuarios, roles, visitas, bitacora] = await Promise.all([
    tiene('usuarios.ver') ? pedir('/usuarios') : [],
    tiene('usuarios.ver', 'roles.gestionar') ? pedir('/roles') : [],
    tiene('visitas.autorizar', 'visitas.registrar') ? pedir('/visitas') : [],
    tiene('bitacora.ver') ? pedir('/bitacora') : [],
  ])
  return { usuarios, roles, visitas, bitacora }
}

export function AppProvider({ children }) {
  const [sesion, setSesion] = useState(null) // { usuario, rol, permisos }
  const [datos, setDatos] = useState(DATOS_VACIOS)
  const [cargando, setCargando] = useState(() => Boolean(leerToken()))

  function limpiarSesion() {
    guardarToken(null)
    setSesion(null)
    setDatos(DATOS_VACIOS)
  }

  async function instalar(perfil) {
    const nuevosDatos = await cargarDatos(perfil.rol.permisos)
    setSesion({ usuario: perfil.usuario, rol: perfil.rol, permisos: perfil.permisos })
    setDatos(nuevosDatos)
  }

  // Si la página se recarga y hay un token guardado, el servidor decide si sigue vigente.
  useEffect(() => {
    if (!leerToken()) return undefined
    let vigente = true
    pedir('/yo')
      .then(async (perfil) => {
        const nuevosDatos = await cargarDatos(perfil.rol.permisos)
        if (!vigente) return
        setSesion({ usuario: perfil.usuario, rol: perfil.rol, permisos: perfil.permisos })
        setDatos(nuevosDatos)
      })
      .catch(() => {
        if (vigente) limpiarSesion()
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [])

  const usuario = sesion?.usuario ?? null
  const rol = sesion?.rol ?? null

  // ¿El usuario actual tiene este permiso? Acepta un permiso o una lista (basta uno).
  // Solo sirve para mostrar u ocultar opciones: el servidor es quien lo exige de verdad.
  function tiene(permiso) {
    if (!rol) return false
    const lista = Array.isArray(permiso) ? permiso : [permiso]
    return lista.some((p) => rol.permisos.includes(p))
  }

  // Vuelve a leer el perfil y los datos (los permisos pudieron cambiar).
  async function recargar() {
    const perfil = await pedir('/yo')
    await instalar(perfil)
  }

  // Ejecuta una acción en el servidor y refresca la pantalla; devuelve { ok } o { ok, error }.
  async function ejecutar(accion) {
    try {
      const resultado = await accion()
      await recargar()
      return { ok: true, resultado }
    } catch (error) {
      if (error.estado === 401) {
        limpiarSesion()
        return { ok: false, error: 'Tu sesión venció. Inicia sesión de nuevo.' }
      }
      return { ok: false, error: error.message }
    }
  }

  // ---------- Sesión ----------
  async function iniciarSesion(correo, password) {
    try {
      const perfil = await pedir('/login', { metodo: 'POST', cuerpo: { correo, password } })
      guardarToken(perfil.token)
      await instalar(perfil)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error.message }
    }
  }

  async function cerrarSesion() {
    try {
      await pedir('/logout', { metodo: 'POST' })
    } catch {
      // aunque el servidor no responda, la sesión se cierra en este navegador
    }
    limpiarSesion()
  }

  // ---------- Mi cuenta ----------
  const cambiarMiPassword = (actual, nueva) =>
    ejecutar(() => pedir('/yo/password', { metodo: 'POST', cuerpo: { actual, nueva } }))

  // ---------- Usuarios ----------
  const crearUsuario = (datosUsuario) =>
    ejecutar(() => pedir('/usuarios', { metodo: 'POST', cuerpo: datosUsuario }))

  const editarUsuario = (id, { nombre, correo, casa }) =>
    ejecutar(() =>
      pedir(`/usuarios/${id}`, { metodo: 'PATCH', cuerpo: { nombre, correo, casa } }),
    )

  const restablecerPassword = (id, password) =>
    ejecutar(() =>
      pedir(`/usuarios/${id}/restablecer`, { metodo: 'POST', cuerpo: { password } }),
    )

  const cambiarRolUsuario = (id, rolId) =>
    ejecutar(() => pedir(`/usuarios/${id}`, { metodo: 'PATCH', cuerpo: { rolId } }))

  const alternarActivo = (id) => {
    const objetivo = datos.usuarios.find((u) => u.id === id)
    return ejecutar(() =>
      pedir(`/usuarios/${id}`, { metodo: 'PATCH', cuerpo: { activo: !objetivo.activo } }),
    )
  }

  // ---------- Roles y permisos ----------
  const alternarPermiso = (rolId, permisoId) => {
    const concedido = !datos.roles.find((r) => r.id === rolId).permisos.includes(permisoId)
    return ejecutar(() =>
      pedir(`/roles/${rolId}/permisos/${permisoId}`, { metodo: 'PUT', cuerpo: { concedido } }),
    )
  }

  // ---------- Visitas ----------
  const autorizarVisita = ({ visitante, fecha }) =>
    ejecutar(() => pedir('/visitas', { metodo: 'POST', cuerpo: { visitante, fecha } }))

  const cambiarEstadoVisita = (id, estado) =>
    ejecutar(() => pedir(`/visitas/${id}`, { metodo: 'PATCH', cuerpo: { estado } }))

  const valor = {
    ...datos,
    permisos: sesion?.permisos ?? [],
    cargando,
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
