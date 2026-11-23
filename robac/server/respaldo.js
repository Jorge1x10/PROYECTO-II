// Respaldos de la base de datos SQLite.
// VACUUM INTO escribe una copia completa y consistente aunque el servidor siga atendiendo.
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

export const RESPALDOS_A_CONSERVAR = 7
const PATRON = /^robac-\d{8}-\d{6}\.db$/

function marca(fecha) {
  const dos = (n) => String(n).padStart(2, '0')
  return (
    `${fecha.getFullYear()}${dos(fecha.getMonth() + 1)}${dos(fecha.getDate())}-` +
    `${dos(fecha.getHours())}${dos(fecha.getMinutes())}${dos(fecha.getSeconds())}`
  )
}

export function listarRespaldos(carpeta) {
  if (!existsSync(carpeta)) return []
  return readdirSync(carpeta)
    .filter((nombre) => PATRON.test(nombre))
    .sort()
}

// Crea un respaldo y borra los más viejos para conservar solo los últimos `conservar`.
export function respaldar(
  db,
  carpeta,
  { ahora = new Date(), conservar = RESPALDOS_A_CONSERVAR } = {},
) {
  mkdirSync(carpeta, { recursive: true })
  const ruta = join(carpeta, `robac-${marca(ahora)}.db`)
  if (existsSync(ruta)) rmSync(ruta)
  db.prepare('VACUUM INTO ?').run(ruta)

  const todos = listarRespaldos(carpeta)
  for (const viejo of todos.slice(0, Math.max(0, todos.length - conservar))) {
    rmSync(join(carpeta, viejo))
  }
  return ruta
}

// Respaldo al arrancar y después cada `horas`. Devuelve una función para detenerlo.
export function programarRespaldos(db, carpeta, horas) {
  const hacer = () => {
    try {
      console.log(`Respaldo creado: ${respaldar(db, carpeta)}`)
    } catch (error) {
      console.error('No se pudo crear el respaldo:', error)
    }
  }
  hacer()
  const reloj = setInterval(hacer, horas * 60 * 60 * 1000)
  reloj.unref()
  return () => clearInterval(reloj)
}
