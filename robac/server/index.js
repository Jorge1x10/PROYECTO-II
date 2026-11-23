// Arranque del servidor: npm run server
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { crearApp } from './app.js'
import { crearEnvioDeCodigo } from './correo.js'
import { abrirBase, administradorInicial, leerAjuste } from './db.js'
import { programarRespaldos } from './respaldo.js'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const rutaBase = process.env.ROBAC_DB ?? join(raiz, 'data', 'robac.db')
const puerto = Number(process.env.PORT ?? 3001)
const anfitrion = process.env.HOST ?? '127.0.0.1'
const enProduccion = process.env.NODE_ENV === 'production'

let administrador
try {
  administrador = administradorInicial(process.env)
} catch (error) {
  console.error(`No se puede iniciar ROBAC: ${error.message}`)
  process.exit(1)
}

// En producción nunca se crea una base con las cuentas de prueba.
const AYUDA_ADMIN =
  'Define ROBAC_ADMIN_CORREO y ROBAC_ADMIN_CLAVE para crear al primer administrador.'
if (enProduccion && !administrador && !existsSync(rutaBase)) {
  console.error(`No se puede iniciar ROBAC en producción sin administrador. ${AYUDA_ADMIN}`)
  process.exit(1)
}

const db = await abrirBase(rutaBase, { administrador })
const conCuentasDePrueba = leerAjuste(db, 'cuentas_prueba') === '1'
if (enProduccion && conCuentasDePrueba) {
  console.error(
    `La base ${rutaBase} tiene las cuentas de prueba y no se puede usar en producción. ` +
      `Usa una base nueva. ${AYUDA_ADMIN}`,
  )
  process.exit(1)
}

// Si ya existe la versión compilada de React (npm run build), el servidor también la sirve.
const dist = join(raiz, 'dist')
const correo = crearEnvioDeCodigo(process.env)
const app = crearApp({
  db,
  enviarCodigo: correo.enviar,
  carpetaWeb: existsSync(dist) ? dist : null,
})

// Respaldo al arrancar y cada 24 horas (ROBAC_RESPALDO_HORAS=0 los desactiva).
const horasRespaldo = Number(process.env.ROBAC_RESPALDO_HORAS ?? 24)
const carpetaRespaldos = process.env.ROBAC_RESPALDOS ?? join(dirname(rutaBase), 'respaldos')
if (horasRespaldo > 0) programarRespaldos(db, carpetaRespaldos, horasRespaldo)

app.listen(puerto, anfitrion, () => {
  console.log(`ROBAC escuchando en http://${anfitrion}:${puerto}`)
  console.log(`Base de datos: ${rutaBase}`)
  console.log(`Códigos de recuperación: ${correo.modo}`)
  console.log(`Cuentas de prueba: ${conCuentasDePrueba ? 'sí (solo para demostración)' : 'no'}`)
  console.log(
    horasRespaldo > 0
      ? `Respaldos: cada ${horasRespaldo} h en ${carpetaRespaldos}`
      : 'Respaldos: desactivados',
  )
})
