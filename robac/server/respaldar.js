// Respaldo manual de la base de datos: npm run respaldo
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { abrirBase } from './db.js'
import { respaldar } from './respaldo.js'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const rutaBase = process.env.ROBAC_DB ?? join(raiz, 'data', 'robac.db')
const carpeta = process.env.ROBAC_RESPALDOS ?? join(dirname(rutaBase), 'respaldos')

const db = await abrirBase(rutaBase)
console.log(`Respaldo creado: ${respaldar(db, carpeta)}`)
db.close()
