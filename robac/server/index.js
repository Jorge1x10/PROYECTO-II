// Arranque del servidor: npm run server
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { crearApp } from './app.js'
import { abrirBase } from './db.js'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const rutaBase = process.env.ROBAC_DB ?? join(raiz, 'data', 'robac.db')
const puerto = Number(process.env.PORT ?? 3001)
const anfitrion = process.env.HOST ?? '127.0.0.1'

// Si ya existe la versión compilada de React (npm run build), el servidor también la sirve.
const dist = join(raiz, 'dist')
const db = await abrirBase(rutaBase)
const app = crearApp({ db, carpetaWeb: existsSync(dist) ? dist : null })

app.listen(puerto, anfitrion, () => {
  console.log(`ROBAC escuchando en http://${anfitrion}:${puerto}`)
  console.log(`Base de datos: ${rutaBase}`)
})
