// Cliente de la API de ROBAC: todas las pantallas hablan con el servidor a través de aquí.
const CLAVE_TOKEN = 'robac-token'

// En desarrollo Vite redirige /api al servidor; las pruebas usan una dirección completa.
let base = ''

export function configurarBase(url) {
  base = url
}

export class ErrorApi extends Error {
  constructor(mensaje, estado) {
    super(mensaje)
    this.estado = estado
  }
}

export function leerToken() {
  try {
    return localStorage.getItem(CLAVE_TOKEN)
  } catch {
    return null
  }
}

export function guardarToken(token) {
  try {
    if (token) localStorage.setItem(CLAVE_TOKEN, token)
    else localStorage.removeItem(CLAVE_TOKEN)
  } catch {
    // sin almacenamiento la sesión dura solo mientras la página sigue abierta
  }
}

export async function pedir(ruta, { metodo = 'GET', cuerpo } = {}) {
  const headers = {}
  if (cuerpo !== undefined) headers['Content-Type'] = 'application/json'
  const token = leerToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let respuesta
  try {
    respuesta = await fetch(`${base}/api${ruta}`, {
      method: metodo,
      headers,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    })
  } catch {
    throw new ErrorApi('No se pudo conectar con el servidor. Intenta de nuevo.', 0)
  }

  const datos = await respuesta.json().catch(() => null)
  if (!respuesta.ok) {
    throw new ErrorApi(datos?.error ?? 'Ocurrió un error inesperado.', respuesta.status)
  }
  return datos
}
